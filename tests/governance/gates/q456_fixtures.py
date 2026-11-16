"""Synthetic inputs for the tests of the Q04, Q05 and Q06 runners.

Every fixture has the SHAPE of the real dump that the node children (tools/bt/gates/q04_arrival.mjs, q05_speed.mjs, q06_path.mjs) write and is small enough to read. A test injects exactly one defect into a copy
and asks the runner to find it (GATE-SPEC U-25, K11: a gate must be able to fail). Minutes are minutes since 1863-06-01 00:00 local mean time, as in the application (clock.mjs).
"""
import copy
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
GATES = os.environ.get('BT_GATES_DIR') or os.path.join(ROOT, 'tools', 'bt', 'gates')           # BT_GATES_DIR: a copy of the runners with a check disabled (the mutation check)
for p in (GATES, os.path.join(GATES, 'lib'), os.path.join(ROOT, 'tools', 'bt')):
    if p not in sys.path:
        sys.path.insert(0, p)


def minute(day, hh=0, mm=0, month=7):
    """Minutes since 1863-06-01 00:00 of July `day` (or June when month=6)."""
    base = 30 * 1440 if month == 7 else 0
    return base + (day - 1) * 1440 + hh * 60 + mm


FROM, TO = 25 * 1440, 25 * 1440 + 27360 - 1            # 26 June 00:00 .. 14 July 23:59 (clock.mjs BATTLE: 36000 .. 63360 is 36000 + 27360)
FROM, TO = 36000, 63360
GROUND = {'W': 3000.0, 'H': 2500.0}


def runs(a, b=TO):
    return {'runs': [[a, b]], 'samples': int(b - a) + 1}


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- Q04
def _unit(uid, level='regiment', arm='infantry', parent=None, status='on_field', drawn=True, deps=(), group=None, kind='col', register='EG-0005', render=None, side='union'):
    return {'id': uid, 'name': uid, 'side': side, 'arm': arm, 'level': level, 'parent': parent, 'status': status, 'drawn': drawn, 'render': render or ('moving' if drawn else ('not_on_field' if status != 'on_field' else 'aggregate')),
            'count': 300 if drawn else 0, 'klass': 1 if arm == 'cavalry' else 0, 'slot_kind': kind if drawn else 'none', 'formation_kind': 'column_fours', 'register': register, 'tier': 'plausible-procedural', 'deps': list(deps), 'group': group}


def _behaviour(h, earliest, default, *, tier='plausible-procedural', classes=None, leave=None, enter_t=None, entry=(-77.2, 39.78), first_xz=(-3500.0, 100.0), n_paths=1, formations=(), effects=True, manifest=True, scan='delegated'):
    enter_t = default if enter_t is None else enter_t
    cl = {'soldiers': runs(default), 'casualties': dict(runs(default + 40), falls=12, first_fall_s=(default + 40) * 60.0, last_fall_s=(default + 90) * 60.0)} if classes is None else classes
    if manifest and 'manifest' not in cl and 'soldiers' in cl:
        cl['manifest'] = {'runs': [[default, default + 3]], 'samples': 12, 'enters': default, 'scanned_to': default + 3}
    return {
        'hash': h, 'classes': cl, 'scanned_in': scan,
        'effects': ({'events_before': 0, 'types_before': {}, 'first_before': None, 'first_after_s': default * 60.0, 'first_segment_s': default * 60.0, 'windows': [[FROM * 60 - 7200, earliest * 60]]} if effects and 'soldiers' in cl else None),
        'train': None, 'arrival': {'earliest': earliest, 'default': default, 'latest': default, 'tier': tier, 'sources': ['PDF-B24'], 'conflict': None, 'entry': {'lng': entry[0], 'lat': entry[1], 'sigma_m': 40}, 'entry_status': 'resolved: where Emmitsburg Road leaves the loaded ground'},
        'enter': {'t': enter_t, 'at': {'lng': entry[0], 'lat': entry[1]}}, 'enter_in_box': False, 'first_sample': {'t': enter_t, 'x': first_xz[0], 'z': first_xz[1]}, 'last_sample': {'t': TO, 'x': 0.0, 'z': 0.0},
        'first_path': ({'t': enter_t, 'wp0': {'t': enter_t, 'lng': entry[0], 'lat': entry[1], 'sigma_m': 40}} if n_paths else None), 'n_paths': n_paths, 'leave': leave,
        'formations': list(formations), 'events': {'n': 20, 'before_earliest': 0, 'first_before_earliest': None, 'state_before_enter': 0}, 'refused': [], 'n_refused': 0, 'hidden_flag': {'mismatch_samples': 0, 'first': None},
    }


def q04_dump():
    """army -> V Corps (a regiment and a battery), II Corps (a regiment, one variant under C-004=v0), VI Corps, Hood, Pickett, Stuart's Fitz Lee brigade; a unit never on the field; an open-gap unit not drawn.
    Everything is as the product should be: zero presence before the windows, entry at the edge in column, no departure, effects after the arrival only."""
    U = [
        _unit('us-aop', 'army', None, None, drawn=False),
        _unit('us-5c', 'corps', None, 'us-aop', drawn=False, deps=['C-003'], group=3),
        _unit('us-5c-1d-r1', 'regiment', 'infantry', 'us-5c', deps=['C-003'], group=3),
        _unit('us-5c-art-b1', 'battery', 'artillery', 'us-5c', deps=['C-003'], group=3),
        _unit('us-2c', 'corps', None, 'us-aop', drawn=False, deps=['C-004'], group=4),
        _unit('us-2c-1d-r1', 'regiment', 'infantry', 'us-2c', deps=['C-004'], group=4),
        _unit('us-6c', 'corps', None, 'us-aop', drawn=False),
        _unit('us-6c-1d-r1', 'regiment', 'infantry', 'us-6c'),
        _unit('cs-1c-hood', 'division', None, None, drawn=False, side='confederate'),
        _unit('cs-1c-hood-r1', 'regiment', 'infantry', 'cs-1c-hood', side='confederate'),
        _unit('cs-1c-pickett', 'division', None, None, drawn=False, side='confederate'),
        _unit('cs-1c-pickett-garnett-r1', 'regiment', 'infantry', 'cs-1c-pickett', side='confederate'),
        _unit('cs-cav-flee', 'brigade', None, None, drawn=False, side='confederate'),
        _unit('cs-cav-flee-1va', 'regiment', 'cavalry', 'cs-cav-flee', side='confederate', kind='cav'),
        _unit('us-cav-2d-huey', 'brigade', None, None, status='never_on_field', drawn=False),
        _unit('us-1c-2d-open', 'regiment', 'infantry', 'us-aop', drawn=False, render='not_drawn'),
    ]
    h = {'us-5c-1d-r1': ('a1', 'a2'), 'us-5c-art-b1': ('b1', 'b2'), 'us-2c-1d-r1': ('c1', 'c2')}
    sc_ids = ['delegated', 'pdf', 'G3:C-003=v0', 'G4:C-004=v0']
    scenarios = {
        'delegated': {'id': 'delegated', 'kind': 'named', 'group': None, 'varied': [], 'choices': {'C-003': 'delegated', 'C-004': 'delegated'}, 'optionText': {}, 'changed': 0},
        'pdf': {'id': 'pdf', 'kind': 'named', 'group': None, 'varied': ['C-003', 'C-004'], 'choices': {'C-003': 'recommended', 'C-004': 'recommended'}, 'optionText': {}, 'changed': 0},
        'G3:C-003=v0': {'id': 'G3:C-003=v0', 'kind': 'group', 'group': 3, 'varied': ['C-003'], 'choices': {'C-003': 'v0', 'C-004': 'delegated'}, 'optionText': {}, 'changed': 2},
        'G4:C-004=v0': {'id': 'G4:C-004=v0', 'kind': 'group', 'group': 4, 'varied': ['C-004'], 'choices': {'C-003': 'delegated', 'C-004': 'v0'}, 'optionText': {}, 'changed': 1},
    }
    default_hash = {u['id']: 'd-' + u['id'] for u in U}
    for uid, (a, _b) in h.items():
        default_hash[uid] = a
    hashes = {'default': default_hash, 'scenarios': {s: {} for s in sc_ids}}
    hashes['scenarios']['G3:C-003=v0'] = {'us-5c-1d-r1': 'a2', 'us-5c-art-b1': 'b2'}
    hashes['scenarios']['G4:C-004=v0'] = {'us-2c-1d-r1': 'c2'}
    ev_after = {}
    B = {}
    v5, v2, v6 = minute(2, 5), minute(2, 8), minute(2, 5)
    B['us-5c-1d-r1'] = {'a1': _behaviour('a1', v5, minute(2, 8)), 'a2': _behaviour('a2', v5, minute(2, 5))}
    cls_b = {'soldiers': runs(minute(2, 8)), 'crew': dict(runs(minute(2, 8)), groups=4), 'guns': dict(runs(minute(2, 8)), pieces=4), 'train.guns': {'runs': [], 'samples': 0}}
    for l in ('limbers', 'caissons', 'wagons', 'horses', 'drivers'):
        cls_b['train.' + l] = runs(minute(2, 8))
    cls_b2 = copy.deepcopy(cls_b)
    for k in cls_b2:
        if cls_b2[k]['runs']:
            cls_b2[k]['runs'] = [[minute(2, 5), TO]]
    B['us-5c-art-b1'] = {'b1': _behaviour('b1', v5, minute(2, 8), classes=cls_b), 'b2': _behaviour('b2', v5, minute(2, 5), classes=cls_b2)}
    B['us-2c-1d-r1'] = {'c1': _behaviour('c1', minute(1, 22, 30), minute(2, 6)), 'c2': _behaviour('c2', minute(1, 22, 30), minute(1, 22, 30))}
    B['us-6c-1d-r1'] = {'d-us-6c-1d-r1': _behaviour('d-us-6c-1d-r1', minute(2, 14), minute(2, 14))}
    B['cs-1c-hood-r1'] = {'d-cs-1c-hood-r1': _behaviour('d-cs-1c-hood-r1', minute(2, 5, 30), minute(2, 6, 30))}
    B['cs-1c-pickett-garnett-r1'] = {'d-cs-1c-pickett-garnett-r1': _behaviour('d-cs-1c-pickett-garnett-r1', minute(2, 20, 4), minute(3, 4, 36))}
    B['cs-cav-flee-1va'] = {'d-cs-cav-flee-1va': _behaviour('d-cs-cav-flee-1va', minute(2, 19, 32), minute(2, 19, 32), tier='inferred', classes={'soldiers': runs(minute(2, 19, 32)), 'horses': dict(runs(minute(2, 19, 32)), horses=300)})}
    for uid in ('us-aop', 'us-5c', 'us-2c', 'us-6c', 'cs-1c-hood', 'cs-1c-pickett', 'cs-cav-flee', 'us-cav-2d-huey', 'us-1c-2d-open'):
        B[uid] = {default_hash[uid]: {'hash': default_hash[uid], 'classes': {}, 'effects': None, 'train': None, 'arrival': None if uid in ('us-cav-2d-huey', 'us-1c-2d-open') else {'earliest': minute(2, 5), 'default': minute(2, 5), 'latest': minute(2, 5), 'tier': 'inferred', 'sources': [], 'conflict': None, 'entry': None, 'entry_status': 'aggregate'},
                                      'enter': None, 'enter_in_box': None, 'first_sample': None, 'last_sample': None, 'first_path': None, 'n_paths': 0, 'leave': None, 'formations': [], 'events': {'n': 0, 'before_earliest': 0, 'first_before_earliest': None, 'state_before_enter': 0},
                                      'refused': [], 'n_refused': 0, 'hidden_flag': {'mismatch_samples': 0, 'first': None}, 'scanned_in': 'delegated'}}
    for u in U:
        if u['id'] in ('us-5c', 'us-2c'):                      # the corps carry the conflict: its units have two behaviours (their hashes are keyed by id)
            pass
    for uid in ('us-5c', 'us-2c'):
        pass
    dflt = {s: {'id': s, 'scanned_units': len(U), 'full': s == 'delegated', 'grid': {'mode': 'dense', 'samples': 27375, 'integer_minutes': 27361, 'boundaries': 14, 'from': FROM, 'to': TO}, 'consistency': {'down_mismatch_samples': 0, 'down_first': None, 'mounted_mismatch_samples': 0, 'soldiers_mismatch_samples': 0},
                  'load': {'events': 100, 'rejected': 0, 'unsupported': 0}, 'refused_total': 0, 'ms': 10} for s in ('delegated',)}
    scans = [{'scenario': 'delegated', 'scanned_units': len(U), 'full': True, 'grid': dflt['delegated']['grid'], 'consistency': dflt['delegated']['consistency'], 'load': dflt['delegated']['load'], 'refused_total': 0, 'ms': 10},
             {'scenario': 'G3:C-003=v0', 'scanned_units': 2, 'full': False, 'grid': dflt['delegated']['grid'], 'consistency': dflt['delegated']['consistency'], 'load': dflt['delegated']['load'], 'refused_total': 0, 'ms': 5},
             {'scenario': 'G4:C-004=v0', 'scanned_units': 1, 'full': False, 'grid': dflt['delegated']['grid'], 'consistency': dflt['delegated']['consistency'], 'load': dflt['delegated']['load'], 'refused_total': 0, 'ms': 5}]
    return {
        'schema': 'q04-dump/1', 'layer': {'id': 'real-1', 'units': len(U)}, 'ground': GROUND, 'battle': {'from': FROM, 'to': TO},
        'grid': {'mode': 'dense', 'from': FROM, 'to': TO, 'boundary_s': 1},
        'scenario_set': {'id': 'S*', 'complete': True, 'count': 4, 'groups': [{'id': 3, 'conflicts': ['C-003'], 'options': {'C-003': ['delegated', 'recommended', 'v0']}, 'product': 3, 'units': 3}, {'id': 4, 'conflicts': ['C-004'], 'options': {'C-004': ['delegated', 'recommended', 'v0']}, 'product': 3, 'units': 2}],
                         'options': {}, 'factorisation': {'scenarios': 4, 'violations': [], 'joint': [{'scenario': 'pdf', 'compared': 16, 'mismatches': [], 'n_mismatch': 0}], 'checked_units': len(U), 'rule': 'fixture'},
                         'restriction_check': {'checked': True, 'scenario': 'G3:C-003=v0', 'units': 2, 'differences': [], 'n_differences': 0}},
        'scenarios': scenarios, 'units': U, 'hashes': hashes, 'behaviours': B, 'scans': scans, 'train': {'readings': [None], 'file': 'app/data/artillery-train.json'}, 'effects_run': True, 'manifest_run': True, 'selected_units': None,
    }


def q04_inputs():
    """What load_inputs reads on the real tree: the independent bounds (history/arrivals.json by the rule of check_arrivals.gate_time), the not-on-field table, the register."""
    b = {
        'us-aop': {'abs_min': minute(2, 0), 'owner': 'us-aop-hq', 'kind': 'printed_clock', 'tier': 'documented', 'values': [], 'earliest': minute(2, 0)},
        'us-5c': {'abs_min': minute(2, 5), 'owner': 'us-5c', 'kind': 'printed_clock', 'tier': 'documented', 'values': [minute(2, 5), minute(2, 8)], 'earliest': minute(2, 5)},
        'us-5c-1d-r1': {'abs_min': minute(2, 5), 'owner': 'us-5c', 'kind': 'printed_clock', 'tier': 'documented', 'values': [minute(2, 5), minute(2, 8)], 'earliest': minute(2, 5)},
        'us-5c-art-b1': {'abs_min': minute(2, 5), 'owner': 'us-5c', 'kind': 'printed_clock', 'tier': 'documented', 'values': [minute(2, 5), minute(2, 8)], 'earliest': minute(2, 5)},
        'us-2c': {'abs_min': minute(1, 22, 30), 'owner': 'us-2c', 'kind': 'printed_clock', 'tier': 'documented', 'values': [minute(1, 22, 30)], 'earliest': minute(1, 22, 30)},
        'us-2c-1d-r1': {'abs_min': minute(1, 22, 30), 'owner': 'us-2c', 'kind': 'printed_clock', 'tier': 'documented', 'values': [minute(1, 22, 30)], 'earliest': minute(1, 22, 30)},
        'us-6c': {'abs_min': minute(2, 14), 'owner': 'us-6c', 'kind': 'printed_clock', 'tier': 'documented', 'values': [minute(2, 14), minute(2, 17)], 'earliest': minute(2, 14)},
        'us-6c-1d-r1': {'abs_min': minute(2, 14), 'owner': 'us-6c', 'kind': 'printed_clock', 'tier': 'documented', 'values': [minute(2, 14), minute(2, 17)], 'earliest': minute(2, 14)},
        'cs-1c-hood': {'abs_min': minute(2, 5, 30), 'owner': 'cs-1c-hood', 'kind': 'printed_clock', 'tier': 'documented', 'values': [minute(2, 5, 30)], 'earliest': minute(2, 5, 30)},
        'cs-1c-hood-r1': {'abs_min': minute(2, 5, 30), 'owner': 'cs-1c-hood', 'kind': 'printed_clock', 'tier': 'documented', 'values': [minute(2, 5, 30)], 'earliest': minute(2, 5, 30)},
        'cs-1c-pickett': {'abs_min': minute(2, 20, 4), 'owner': 'cs-1c-pickett', 'kind': 'named_period_convention', 'tier': 'inferred', 'values': [], 'earliest': minute(2, 20, 4)},
        'cs-1c-pickett-garnett-r1': {'abs_min': minute(2, 20, 4), 'owner': 'cs-1c-pickett', 'kind': 'named_period_convention', 'tier': 'inferred', 'values': [], 'earliest': minute(2, 20, 4)},
        'cs-cav-flee': {'abs_min': minute(2, 19, 32), 'owner': 'cs-cav-flee-chambliss', 'kind': 'named_period_convention', 'tier': 'inferred', 'values': [], 'earliest': minute(2, 19, 32)},
        'cs-cav-flee-1va': {'abs_min': minute(2, 19, 32), 'owner': 'cs-cav-flee-chambliss', 'kind': 'named_period_convention', 'tier': 'inferred', 'values': [], 'earliest': minute(2, 19, 32)},
        'us-cav-2d-huey': {'abs_min': None, 'owner': None, 'kind': None, 'tier': None, 'values': [], 'earliest': None},
        'us-1c-2d-open': {'abs_min': minute(2, 5), 'owner': 'us-1c', 'kind': 'none', 'tier': 'open gap', 'values': [], 'earliest': minute(2, 5)},
    }
    return {'bound': b, 'nof': {'units': [{'id': 'us-cav-2d-huey', 'status': 'never_on_field'}]},
            'arrivals': {'meta': {'named_periods': {'evening': {'t': '1863-07-02T19:32'}, 'sunrise_jul3': {'t': '1863-07-03T04:36'}}}, 'rows': [{'unit_id': 'cs-cav-hampton', 'detached_roles': [{'unit': 'cs-cav-hampton', 'location': 'hunterstown'}]}]},
            'register': {'EG-0005': {'id': 'EG-0005', 'status': 'open'}}, 'cross': {'compared': 0, 'differences': []}}


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- Q05
def _leg(i, t0, t1, length, gait, mean=None, mx=None, mn=None, zero=0, start=(0.0, 0.0), end=None):
    dur = (t1 - t0) * 60.0
    mean = length / dur if mean is None else mean
    return {'i': i, 't0': t0, 't1': t1, 'dur_s': dur, 'length_m': length, 'mean_ms': mean, 'max_seg_ms': mean if mx is None else mx, 'min_seg_ms': mean if mn is None else mn, 'n_wp': 3, 'zero_time_moves': zero, 'gait': gait,
            'tier': 'plausible-procedural', 'sources': ['PLACEMENT'], 'start': list(start), 'end': list(end if end is not None else (length, 0.0))}


def _q05_behaviour(h, legs, *, arm='infantry', turns=None, offsets=None, step=None, gun_step=None, train=None, extent=40.0, entry_xz=(0.0, 0.0)):
    joins = []
    for k, l in enumerate(legs):
        prev = legs[k - 1] if k else None
        joins.append({'i': k, 'd_m': 0.0, 'gap_s': 0.0 if k == 0 else 600.0, 'after': 'leg' if prev else 'entry'})
    return {'hash': h, 'arm': arm, 'drawn': True, 'render': 'moving', 'klass': 1 if arm == 'cavalry' else 0, 'extent_m': extent, 'n_events': 30, 'arrival': {'earliest': 44940, 'default': 45120, 'latest': 45120},
            'enter': {'t': 45120, 'xz': list(entry_xz)}, 'legs': legs, 'joins': joins, 'turns': turns if turns is not None else [{'t': 45200.0, 'dA': 0.3, 'turn_s': 25.0, 'r_m': extent, 'v_ms': 1.25, 'omega_peak': 0.018, 'rot_peak_ms': 0.72, 'edge_peak_ms': 1.44, 'edge_sum_ms': 1.97, 'edge_mean_ms': 1.35}],
            'step': step or {'max': 2.44, 'at': 45121.0, 'n_over': 0, 'pairs': 300, 'offenders': [], 'vmax_at_pair': {'d': 2.44, 'dt': 1}}, 'gun_step': gun_step, 'train': train, 'offsets': offsets if offsets is not None else [], 'n_crew_groups': 0, 'max_turn_edge_ms': 1.44}


def q05_dump():
    U = [_unit('us-aop', 'army', None, None, drawn=False), _unit('us-1c-1d-r1', 'regiment', 'infantry', 'us-aop', deps=['C-004'], group=4), _unit('us-1c-art-b1', 'battery', 'artillery', 'us-aop'), _unit('us-cav-1d-c1', 'regiment', 'cavalry', 'us-aop', kind='cav')]
    for u in U:
        u['register'] = 'EG-0001'
    h = {u['id']: 'h-' + u['id'] for u in U}
    h['us-1c-1d-r1'] = 'i1'
    leg_dq = _leg(0, 45120.0, 45200.0, 11700.0, 'double_quick', mean=2.4375, mx=2.4384, mn=2.4366)
    leg_m = _leg(1, 45800.0, 46000.0, 15000.0, 'march', mean=1.25)
    tr_ok = {'windows': 3, 'samples': 900, 'lists': {k: {'max_ms': v, 'at': 45300.0, 'n': 100} for k, v in {'guns': 0.0, 'limbers': 1.3, 'caissons': 1.3, 'wagons': 1.2, 'horses': 1.5, 'drivers': 1.5}.items()}}
    off = [{'kind': 'ledger_vs_edge', 'unit': 'us-1c-1d-r1', 'stop': 'PO-01', 'place': 'McPherson Ridge', 'documented': 44000.0, 'arrives': 44052.0, 'distance_m': 7600, 'late_min': 52, 'road': 'Emmitsburg Road', 'list': 'offsets'}]
    B = {'us-1c-1d-r1': {'i1': _q05_behaviour('i1', [leg_dq, leg_m], offsets=off)},
         'us-1c-art-b1': {'h-us-1c-art-b1': _q05_behaviour('h-us-1c-art-b1', [_leg(0, 45120.0, 45500.0, 28500.0, 'march', mean=1.25)], arm='artillery', train=tr_ok, extent=56.0)},
         'us-cav-1d-c1': {'h-us-cav-1d-c1': _q05_behaviour('h-us-cav-1d-c1', [_leg(0, 45120.0, 45500.0, 28500.0, 'march', mean=1.25)], arm='cavalry', extent=60.0)}}
    grid = {'mode': 'dense', 'samples': 27375, 'integer_minutes': 27361}
    return {
        'schema': 'q05-dump/1', 'layer': {'id': 'real-1', 'units': len(U)}, 'ground': GROUND, 'battle': {'from': FROM, 'to': TO}, 'grid': {'mode': 'dense', 'from': FROM, 'to': TO, 'boundary_s': 1, 'resolution_m': 1.0},
        'units': U, 'hashes': {'default': h, 'scenarios': {'delegated': {}, 'pdf': {}}},
        'scenarios': {'delegated': {'id': 'delegated', 'kind': 'named', 'group': None, 'varied': [], 'choices': {'C-004': 'delegated'}, 'optionText': {}, 'changed': 0}, 'pdf': {'id': 'pdf', 'kind': 'named', 'group': None, 'varied': ['C-004'], 'choices': {'C-004': 'recommended'}, 'optionText': {}, 'changed': 0}},
        'scenario_set': {'id': 'S*', 'complete': True, 'count': 2, 'groups': [{'id': 4, 'conflicts': ['C-004'], 'options': {'C-004': ['delegated', 'recommended']}, 'product': 2, 'units': 1}], 'options': {}, 'factorisation': {'scenarios': 2, 'violations': [], 'joint': [{'scenario': 'pdf', 'compared': 4, 'mismatches': [], 'n_mismatch': 0}], 'checked_units': 4, 'rule': 'fixture'}, 'restriction_check': {'checked': False}},
        'behaviours': B, 'scans': [{'scenario': 'delegated', 'scanned_units': 4, 'full': True, 'grid': grid, 'load': {'events': 100, 'rejected': 0, 'unsupported': 0}, 'refused_total': 0, 'ms': 10}],
        'selected_units': None, 'bounds': {'foot_upper': 2.5146, 'cavalry_upper': 4.4704, 'team_upper': 6.096, 'factor': 1.0001}, 'product': {'speed': {'march': 1.25, 'double_quick': 2.4384}, 'stage': {'TURN_S': 25, 'MAX_TURN_EDGE_MS': 4.4}, 'train': {'layout_turn_s': 240}}, 'train_run': True,
    }


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- Q06
def _q06_leg(i, t0, t1, start, end, *, gait='march', tier='plausible-procedural', sources=('PLACEMENT', 'GAZETTEER'), mean=None):
    import math
    ln = math.hypot(end[0] - start[0], end[1] - start[1])
    return {'i': i, 't0': t0, 't1': t1, 'length_m': ln, 'mean_ms': (ln / ((t1 - t0) * 60.0)) if mean is None else mean, 'max_seg_ms': (ln / ((t1 - t0) * 60.0)) if mean is None else mean, 'gait': gait, 'tier': tier, 'sources': list(sources),
            'start': list(start), 'end': list(end), 'start_ll': [-77.26 + start[0] * 1e-5, 39.78 + start[1] * 1e-5], 'end_ll': [-77.26 + end[0] * 1e-5, 39.78 + end[1] * 1e-5]}


def _q06_behaviour(h, *, render='moving', legs=None, formations=(), leave=None, layout=None, entry=True, approach=True, status='on_field', arm='infantry'):
    legs = legs if legs is not None else [_q06_leg(0, 45120.0, 45200.0, (-3500.0, 100.0), (-1500.0, 600.0)), _q06_leg(1, 45200.0, 45260.0, (-1500.0, 600.0), (-900.0, 300.0))]
    joins = []
    for k, l in enumerate(legs):
        joins.append({'i': k, 'd_m': 0.0, 'gap_s': 0.0, 'after': 'leg' if k else 'entry'})
    last = (legs[-2] if (leave and len(legs) > 1) else legs[-1]) if legs else None          # the fighting position is where the chain ends, before the march out
    return {
        'hash': h, 'arm': arm, 'level': 'regiment', 'status': status, 'render': render, 'render_reason': 'Placed by a printed approach road and dated place(s)', 'tier': 'plausible-procedural', 'register': 'EG-0001', 'drawn': render in ('moving', 'edge_only'), 'count': 300,
        'plan': {'status': render, 'reason': '', 'road': 'Emmitsburg Road', 'column_index': 1, 'column_size': 3, 'n_stops': 2, 'n_days': 0, 'n_days_feasible': 0, 'n_skipped': 0, 'n_departures': 1 if leave else 0, 'approach': 'AP-01'},
        'stops': [{'po': 'PO-01', 'place': 'McPherson Ridge', 't_doc': 45200.0, 'depart_doc': None, 'place_tier': 'inferred', 'conflict': None, 'heading_deg': 70.0}],
        'days': [], 'approach': ({'id': 'AP-01', 'road': 'Emmitsburg Road', 'tier': 'plausible-procedural', 'owner': 'us-1c', 'owner_level': 'corps', 'inherited': True, 'modelled': False, 'register': 'EG-0005', 'claim': None, 'row': 'us-1c', 'kind': None, 'has_sources': True} if approach else None),
        'arrival': {'earliest': 45120.0, 'default': 45120.0, 'latest': 45120.0, 'tier': 'plausible-procedural', 'entry_status': 'resolved: where Emmitsburg Road leaves the loaded ground', 'entry': {'lng': -77.26, 'lat': 39.78, 'sigma_m': 40}},
        'entry': ({'t': 45120.0, 'lng': -77.26, 'lat': 39.78, 'x': -3500.0, 'z': 100.0, 'outside_box': True, 'outside_ground': True, 'd_road_m': 0.0, 'road': 'Emmitsburg Road', 'queue_offset_m': 46, 'crossing_s': 3139.0, 'clamped': False} if entry else None),
        'legs': legs, 'joins': joins, 'slot': {'lng': -77.25, 'lat': 39.79, 'x': last['end'][0], 'z': last['end'][1], 'heading_deg': 70.0} if last else None, 'end_vs_slot_m': 0.0,
        'layout': layout or {'kind': 'cav' if arm == 'cavalry' else 'col', 'has_alt': bool(formations), 'base': 'column_fours', 'alt': 'line' if formations else None, 'formation_kind': 'column_fours'},
        'formations': list(formations), 'formation_default_s': 90, 'leave': leave, 'n_events': 20,
    }


def q06_dump():
    U = [_unit('us-aop', 'army', None, None, drawn=False), _unit('us-1c-1d-r1', 'regiment', 'infantry', 'us-aop', deps=['C-004'], group=4), _unit('us-1c-1d-r2', 'regiment', 'infantry', 'us-aop'), _unit('us-cav-1d-c1', 'regiment', 'cavalry', 'us-aop', kind='cav'),
         _unit('us-2c-1d-open', 'regiment', 'infantry', 'us-aop', drawn=False, render='not_drawn'), _unit('us-6c-2d-edge', 'regiment', 'infantry', 'us-aop', render='edge_only'), _unit('us-cav-2d-huey', 'brigade', None, None, status='never_on_field', drawn=False)]
    for u in U:
        u['render'] = {'us-aop': 'aggregate', 'us-2c-1d-open': 'not_drawn', 'us-6c-2d-edge': 'edge_only', 'us-cav-2d-huey': 'not_on_field'}.get(u['id'], 'moving')
        u['drawn'] = u['render'] in ('moving', 'edge_only')
    h = {u['id']: 'q-' + u['id'] for u in U}
    dep_legs = [_q06_leg(0, 45120.0, 45200.0, (-3500.0, 100.0), (-1500.0, 600.0)), _q06_leg(1, 45200.0, 45260.0, (-1500.0, 600.0), (-900.0, 300.0)), _q06_leg(2, 46000.0, 46100.0, (-900.0, 300.0), (-3600.0, 150.0))]
    leave = {'t': 46100.0, 'march_before': {'t1': 46100.0, 'end_ll': [-77.2936, 39.7815], 'end_in_box': False, 'start_vs_last_slot_m': None}}
    form = [{'t': 45261.0, 'formation': 'line', 'duration_s': 90, 'tier': 'plausible-procedural', 'clause': 'CL-001', 'sources': ['PLACEMENT']}]
    B = {'us-1c-1d-r1': {'q-us-1c-1d-r1': _q06_behaviour('q-us-1c-1d-r1')},
         'us-1c-1d-r2': {'q-us-1c-1d-r2': _q06_behaviour('q-us-1c-1d-r2', legs=dep_legs, leave=leave, formations=form)},
         'us-cav-1d-c1': {'q-us-cav-1d-c1': _q06_behaviour('q-us-cav-1d-c1', arm='cavalry')},
         'us-2c-1d-open': {'q-us-2c-1d-open': _q06_behaviour('q-us-2c-1d-open', render='not_drawn', legs=[], entry=False, approach=False)},
         'us-6c-2d-edge': {'q-us-6c-2d-edge': _q06_behaviour('q-us-6c-2d-edge', render='edge_only', legs=[])},
         'us-cav-2d-huey': {'q-us-cav-2d-huey': _q06_behaviour('q-us-cav-2d-huey', render='not_on_field', legs=[], entry=False, approach=False, status='never_on_field')}}
    B['us-6c-2d-edge']['q-us-6c-2d-edge']['plan'].update({'status': 'edge_only', 'reason': 'a road of approach is printed; no place after arrival is printed for this unit', 'n_stops': 0})
    B['us-6c-2d-edge']['q-us-6c-2d-edge']['slot'] = None
    B['us-2c-1d-open']['q-us-2c-1d-open']['render_reason'] = 'Open gap: no road or direction of approach is printed in the ledger for this unit or any unit above it.'
    return {
        'schema': 'q06-dump/1', 'layer': {'id': 'real-1', 'units': len(U)}, 'ground': GROUND, 'battle': {'from': FROM, 'to': TO}, 'units': U, 'hashes': {'default': h, 'scenarios': {'delegated': {}, 'pdf': {}}},
        'scenarios': {'delegated': {'id': 'delegated', 'kind': 'named', 'group': None, 'varied': [], 'choices': {'C-004': 'delegated'}, 'optionText': {}, 'changed': 0}, 'pdf': {'id': 'pdf', 'kind': 'named', 'group': None, 'varied': ['C-004'], 'choices': {'C-004': 'recommended'}, 'optionText': {}, 'changed': 0}},
        'scenario_set': {'id': 'S*', 'complete': True, 'count': 2, 'groups': [{'id': 4, 'conflicts': ['C-004'], 'options': {'C-004': ['delegated', 'recommended']}, 'product': 2, 'units': 1}], 'options': {}, 'factorisation': {'scenarios': 2, 'violations': [], 'joint': [{'scenario': 'pdf', 'compared': 6, 'mismatches': [], 'n_mismatch': 0}], 'checked_units': len(U), 'rule': 'fixture'}, 'restriction_check': {'checked': False}},
        'behaviours': B, 'scans': [], 'selected_units': None, 'product': {'speed': {'march': 1.25, 'double_quick': 2.4384}, 'formation_seconds': 90}, 'resolution_m': 1.0,
    }


def q06_inputs_undrawn():
    return {'files': {'us-1c-1d-art': {'present': True, 'records': 10}}, 'by_unit': {'us-2c-1d-open': {'position': 3, 'arrival': 1}}, 'status': {'us-2c-1d-open': {'reason': 'no_road', 'claims_own': {'total': 4, 'usable': 4}}},
            'checker': {'command': 'check_undrawn.py --all', 'exit': 0, 'files': {'us-1c-1d-art': {'records': 10, 'units_named': 2, 'errors': 0, 'warnings': 0}}}}
