#!/usr/bin/env python3
"""Gate Q04: "Arrival check. No entity of a unit exists in the scene before its arrival window opens; scan every frame range of every scenario." (plan p. 136, Q). GATE-SPEC.md 2, Q04.1 to Q04.7.

    python3 tools/bt/gates/q04_arrival.py [--out DIR] [--dump FILE] [--scenarios S*|default] [--grid dense|coarse] [--mutate FILE.mjs] [--no-write] [--quiet]

Writes `<out>/Q04.json` (default GOVERNANCE/gate_results), record `bt-gate-result/1`. Exit code 0 PASS, 1 FAIL, 2 INCOMPLETE, 3 runner error. It sets no `passes` flag.

The node child q04_arrival.mjs drives the REAL product (the history layer, the world built from it, the Stage the page draws, ArtilleryTrain as Structures.drawLists runs it, the per-figure manifests, the
crowd animation driver and the AnimSystem that makes every shot, smoke puff, march sound and fall) over the scenario set S* and the time grid of GATE-SPEC 1.5, and reports for every unit and every entity class the
maximal runs of grid times at which the class is present. This runner judges those runs against the bounds the python checker (check_arrivals.gate_time) reads independently from history/arrivals.json.

  Q04.1  absolute      presence is zero, for every entity class of every unit in every scenario, at every grid time earlier than the minimum over all documented values of the unit's arrival window
  Q04.2  scenario      presence is zero before the arrival window start the scenario selects (and no layer event, and no event refused by the sim cache, lies before it)
  Q04.3  entry         the first presence of a drawn unit is at the edge of the loaded ground, in column of march (never a deployed unit), with its first leg starting at the entry point
  Q04.4  departure     a unit that leaves does so by a march out of the loaded ground; no entity vanishes (one run of presence from the entry to the leave event or the end of the window)
  Q04.5  unknown       a unit whose arrival the ledger does not document carries a tier below documented, an open register entry, and appears no earlier than its floor event
  Q04.6  named cases   V Corps, II Corps, Longstreet's divisions, Stuart's brigades (gated to the evening of July 2), Pickett (gated to the morning of July 3), the VI Corps, units never or partly on the field
  Q04.7  effects       no shot, smoke, march sound, command or fall that the real animation emits, and no casualty on the ground, exists before the unit's arrival window opens

An item is (unit, behaviour of the unit under the scenarios of S*): two scenarios that give a unit the same arrival record and the same events give it the same scene (every class is a pure function of them), and the
item lists every scenario it stands for. A run on the coarse grid, on a part of S* or with a class switched off is INCOMPLETE and never PASS (GATE-SPEC U-26). No COVERED branch: Q04 has none (K3).
"""
import datetime
import json
import os
import re
import sys
import warnings

HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (HERE, os.path.join(HERE, 'lib'), os.path.abspath(os.path.join(HERE, '..'))):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from oobgates_common import cond, first_failed, gate_rows, layer_dump, register_state, sub_requirements_for  # noqa: E402
from pq_common import Env, InputMissing, Record, base_parser, guarded_main, node_version  # noqa: E402
from q456_inputs import register_inputs  # noqa: E402

GATE = 'Q04'
EPOCH = datetime.datetime(1863, 6, 1)
EPS = 1e-9
SEC = 1.0 / 60.0
NOF_STATUS = ('never_on_field', 'never_main_field', 'documented_absent')
TIER_DOCUMENTED = 'documented'
STUART = ('cs-cav-flee', 'cs-cav-chambliss', 'cs-cav-hampton', 'cs-cav-jenkins')       # Stuart's brigades of the ledger rows (Robertson, Jones and Imboden were never on the main field)
CASES = (('V Corps', ('us-5c',)), ('II Corps', ('us-2c',)), ("Longstreet's divisions (McLaws, Hood)", ('cs-1c-mclaws', 'cs-1c-hood')), ("Stuart's cavalry brigades", STUART),
         ("Pickett's division", ('cs-1c-pickett',)), ('VI Corps', ('us-6c',)))


def iso_min(s):
    return (datetime.datetime.fromisoformat(s) - EPOCH).total_seconds() / 60.0


def under(uid, prefixes):
    return any(uid == p or uid.startswith(p + '-') for p in prefixes)


# ---------------------------------------------------------------------------------------------------- the independent bounds (history/arrivals.json through the python checker's own rules)
def load_bounds(rec, env, units):
    """{unit: {abs_min, owner, kind, tier, values}} from history/arrivals.json and units.json, by the rule of check_arrivals.gate_time (the nearest ancestor-or-self gate; earliest and every printed value), read in
    python and never from the layer. On the real tree the result is cross-checked against check_arrivals.gate_time itself."""
    hist = os.path.join(env.bt, 'history')
    arr = rec.read_json(os.path.join(hist, 'arrivals.json'), 'data')
    uj = rec.read_json(os.path.join(hist, 'units.json'), 'data')
    nof = rec.read_json(os.path.join(hist, 'not_on_field.json'), 'data')
    parent = {u['id']: u.get('parent') for u in uj['units']}
    gates = arr['gates']
    out, cross = {}, {'compared': 0, 'differences': []}
    for u in units:
        uid, x, g, owner = u['id'], u['id'], None, None
        seen = set()
        while x is not None and x not in seen:
            seen.add(x)
            gg = gates.get(x)
            if gg and gg['kind'] != 'none' and (gg.get('earliest') or gg.get('default')):
                g, owner = gg, x
                break
            x = parent.get(x)
        if g is None:
            out[uid] = {'abs_min': None, 'owner': None, 'kind': None, 'tier': None, 'values': [], 'earliest': None}
            continue
        e = iso_min(g.get('earliest') or g['default'])
        vals = [iso_min(v['t']) for v in (g.get('values') or []) if v.get('t')]
        out[uid] = {'abs_min': min([e] + vals), 'owner': owner, 'kind': g['kind'], 'tier': g.get('tier'), 'values': sorted(vals), 'earliest': e}
    # cross-check on the real tree with the checker's own function
    try:
        if os.path.abspath(env.root) == os.path.abspath(os.path.join(HERE, '..', '..', '..')):
            sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..')))
            with warnings.catch_warnings():
                warnings.simplefilter('ignore', ResourceWarning)
                import check_arrivals as CA  # noqa: E402
                CA.load()
            for u in units:
                t, owner = CA.gate_time(u['id'], 'earliest')
                if t is None:
                    continue
                cross['compared'] += 1
                if abs(iso_min(t) - out[u['id']]['earliest']) > 1e-6:
                    cross['differences'].append({'unit': u['id'], 'checker': t, 'read': out[u['id']]['earliest']})
    except Exception as e:  # noqa: BLE001  the cross-check is evidence; a failure to import is recorded, never hidden
        cross['error'] = str(e)[:200]
    return {'bound': out, 'nof': nof, 'arrivals': arr, 'cross': cross}


def load_inputs(rec, env, units):
    K = {}
    try:
        K.update(load_bounds(rec, env, units))
    except InputMissing as e:
        K['missing'] = str(e)
    try:
        K['register'] = {e['id']: e for e in rec.read_json(os.path.join(env.gov, 'register_index.json'), 'data') if isinstance(e, dict) and 'id' in e}
    except InputMissing:
        K['register'] = None
    return K


# ---------------------------------------------------------------------------------------------------- evaluation
def hash_of(D, uid, sid):
    return (D['hashes']['scenarios'].get(sid) or {}).get(uid) or D['hashes']['default'][uid]


def label_of(D, uid, sid, deps):
    sc = D['scenarios'][sid]
    if sid == 'delegated' or sc['kind'] == 'named':
        return sid
    return ','.join('%s=%s' % (c, sc['choices'][c]) for c in deps) or 'delegated'


def variants_of(D, u):
    """[(hash, [scenario ids in order])] for one unit."""
    out = {}
    for sid in D['scenarios']:
        out.setdefault(hash_of(D, u['id'], sid), []).append(sid)
    return list(out.items())


def run_start(c):
    runs = (c or {}).get('runs') or []
    return runs[0][0] if runs else None


def evaluate(rec, env, D, K):
    units_all = D['units']
    sel = set(D.get('selected_units') or [])
    units = [u for u in units_all if not sel or u['id'] in sel]            # a partial scan judges the units it scanned (and is INCOMPLETE)
    by = {u['id']: u for u in units_all}
    rows, all_ids = gate_rows(env, GATE)
    ground, battle = D['ground'], D['battle']
    dense = D['grid']['mode'] == 'dense'
    ss = D['scenario_set']
    complete = bool(ss.get('complete')) and dense and D.get('effects_run') and D.get('manifest_run') and not D.get('selected_units')
    if not dense:
        rec.incomplete('the time grid is the coarse test grid, not every integer minute plus the boundaries (GATE-SPEC 1.5, U-26)')
    if not ss.get('complete'):
        rec.incomplete('the scenario set scanned is not the whole of S* (%s, %d scenarios)' % (ss.get('id'), ss.get('count', 0)))
    if not D.get('effects_run'):
        rec.incomplete('the effects class (the real AnimSystem) was not run in this record')
    if not D.get('manifest_run'):
        rec.incomplete('the manifest class (figure manifests, flags) was not run in this record')
    if D.get('selected_units'):
        rec.incomplete('the scan was restricted to %d selected unit(s)' % len(D['selected_units']))
    if not D.get('train'):
        rec.incomplete('the artillery train (limbers, caissons, wagons, forge, teams of horses) was not scanned in this record (the draw lists could not be built or were switched off)')
    if K.get('missing'):
        rec.incomplete('input missing: %s' % K['missing'])
    bound = (K.get('bound') or {})
    nof_ids = {x['id'] for x in (K.get('nof') or {}).get('units', [])}
    W, H = ground['W'], ground['H']

    # ------------------------------------------------------------------------------------------------ S*: the set itself, the factorisation, the scans
    fz = ss.get('factorisation') or {}
    g_ev = {'groups': ss.get('groups'), 'count': ss.get('count'), 'options': ss.get('options'), 'violations': fz.get('violations'), 'joint': fz.get('joint'), 'rule': fz.get('rule'), 'complete': ss.get('complete')}
    bad_f = list(fz.get('violations') or []) + [j for j in (fz.get('joint') or []) if j.get('n_mismatch')]
    if bad_f:
        rec.item('Q04/S*/factorisation', 'FAIL', 'a unit behaves differently in a scenario of S* without depending on a conflict the scenario varies, or a joint scenario differs from the product of its groups: %s' % json.dumps(bad_f)[:300], g_ev, check='Q04.S*', sub_requirements=rows)
    elif not ss.get('complete'):
        rec.item('Q04/S*/factorisation', 'NOT-RUN', 'the scenario set of this run is %s (%d scenarios), not S*: nothing is claimed for the rest' % (ss.get('id'), ss.get('count', 0)), g_ev, check='Q04.S*', sub_requirements=rows)
    else:
        rec.item('Q04/S*/factorisation', 'PASS', 'S* has %d scenarios in %d interaction groups (the Cartesian product inside each group, every other conflict on its delegated default, the two named defaults and the extremal scenarios); every scenario changes only the units that depend on a conflict it varies, and the %d joint scenarios give every unit the behaviour of its own group' % (ss['count'], len(ss['groups']), len(fz.get('joint') or [])), g_ev, check='Q04.S*', sub_requirements=rows)
    rc = ss.get('restriction_check') or {}
    if rc.get('checked') and not rc.get('n_differences'):
        rec.item('Q04/S*/restriction', 'PASS', 'a scan of only the units a scenario changes gives the same runs as a scan of every unit (%d units of %s compared)' % (rc['units'], rc['scenario']), rc, check='Q04.S*', sub_requirements=rows)
    elif rc.get('checked'):
        rec.item('Q04/S*/restriction', 'FAIL', 'a scan restricted to the changed units differs from a full scan for %d unit(s) of %s: %s' % (rc['n_differences'], rc['scenario'], rc['differences'][:5]), rc, check='Q04.S*', sub_requirements=rows)
    else:
        rec.item('Q04/S*/restriction', 'NOT-RUN', 'the equality of a restricted and a full scan was not checked in this run', rc, check='Q04.S*', sub_requirements=rows)
    for sc in D['scans']:
        sid = sc['scenario']
        if not sc.get('scanned_units'):
            continue
        cs, grid = sc.get('consistency') or {}, sc.get('grid') or {}
        grid_ok = grid.get('mode') == 'dense' and (grid.get('samples') or 0) >= (grid.get('integer_minutes') or 1)
        conds = [cond('no event of the layer was refused by the sim cache (outside the presence window, Q04)', not sc.get('refused_total'), '%s refused' % sc.get('refused_total')),
                 cond('the men lying (Stage._detail) equal the fall table at every sample', not cs.get('down_mismatch_samples'), '%s samples differ, first %s' % (cs.get('down_mismatch_samples'), cs.get('down_first'))),
                 cond('the mounted count the stage reports equals the mounted figures present at every sample (the horses)', not cs.get('mounted_mismatch_samples'), '%s samples differ' % cs.get('mounted_mismatch_samples')),
                 cond('the soldier count the stage reports equals the figures of the present units at every sample', not cs.get('soldiers_mismatch_samples'), '%s samples differ' % cs.get('soldiers_mismatch_samples'))]
        bad = first_failed(conds)
        ev_s = {'conditions': conds, 'grid': grid, 'scanned_units': sc['scanned_units']}
        if bad:
            rec.item('Q04/scan/%s' % sid, 'FAIL', 'scan of %s: ' % sid + '; '.join(bad), ev_s, check='Q04.scan', scenario=sid, sub_requirements=rows)
        elif not grid_ok:
            rec.item('Q04/scan/%s' % sid, 'NOT-RUN', 'scan of %s: the grid is %s (%s samples for %s integer minutes), not every integer minute of the window plus the boundaries (GATE-SPEC 1.5): a fraction of the grid is never a PASS' % (sid, grid.get('mode'), grid.get('samples'), grid.get('integer_minutes')), ev_s, check='Q04.scan', scenario=sid, sub_requirements=rows)
        else:
            rec.item('Q04/scan/%s' % sid, 'PASS', 'scan of %s: %d unit(s) over %s samples (every integer minute and the boundaries), every consistency check holds' % (sid, sc['scanned_units'], grid.get('samples')), ev_s, check='Q04.scan', scenario=sid, sub_requirements=rows)

    # ------------------------------------------------------------------------------------------------ Q04.1, Q04.2, Q04.7: one item per (unit, behaviour)
    per_unit_items = {}                           # unit -> list of (item result, hash) for the aggregations below
    for u in units:
        uid = u['id']
        vs = variants_of(D, u)
        sub = sub_requirements_for(rows, all_ids, uid, populations=('R17',))
        deps = u.get('deps') or []
        used = set()
        b = bound.get(uid) or {}
        abs_min = b.get('abs_min')
        for h, sids in vs:
            lab = label_of(D, uid, sids[0], deps)
            while lab in used:
                lab += '#'
            used.add(lab)
            iid = 'Q04/Q04.1/%s/%s' % (uid, lab)
            R = (D['behaviours'].get(uid) or {}).get(h)
            ev0 = {'scenarios': sids[:12], 'n_scenarios': len(sids), 'hash': h, 'abs_min': abs_min, 'bound_source': ('python checker: gate of %s (%s), the minimum of its earliest and its printed values' % (b.get('owner'), b.get('kind'))) if abs_min is not None else 'none: no documented gate up the line of command (the layer window is used, Q04.5)'}
            if R is None:
                rec.item(iid, 'BLOCKED-INPUT', 'input missing: the node scan holds no record of this unit under behaviour %s (scenarios %s)' % (h, sids[:3]), ev0, check='Q04.1', subjects=[uid], scenario=lab, sub_requirements=sub)
                continue
            cls = R.get('classes') or {}
            a = R.get('arrival')
            e_s = a['earliest'] if a else None
            lo_abs = abs_min if abs_min is not None else e_s
            f_abs, f_scn, f_ev = [], [], []
            for cname, c in sorted(cls.items()):
                s0 = run_start(c)
                if s0 is None:
                    continue
                if lo_abs is not None and s0 < lo_abs - EPS:
                    f_abs.append('%s present at minute %s, %.2f min before the earliest documented value %s' % (cname, s0, lo_abs - s0, lo_abs))
                if e_s is not None and s0 < e_s - EPS:
                    f_scn.append('%s present at minute %s, %.2f min before the window the scenario selects (%s)' % (cname, s0, e_s - s0, e_s))
                if a is None:
                    f_scn.append('%s present at minute %s although the layer gives the unit no arrival record in this scenario' % (cname, s0))
            if a is None and not cls:
                pass
            m = cls.get('manifest')
            if m and m.get('enters') is not None and (m.get('scanned_to') or 0) < m['enters'] - EPS and not m['runs']:
                f_ev.append('the manifest was scanned only to %s, before the unit enters (%s)' % (m.get('scanned_to'), m['enters']))
            fx = R.get('effects')
            if fx:
                if fx.get('events_before'):
                    f_ev.append('the real animation emits %d event(s) (%s) before the window opens, the first at second %s' % (fx['events_before'], fx.get('types_before'), fx.get('first_before')))
                if fx.get('first_segment_s') is not None and lo_abs is not None and fx['first_segment_s'] / 60.0 < lo_abs - EPS:
                    f_abs.append('effects: the animation timeline of the unit starts at minute %s, before the earliest documented value %s' % (fx['first_segment_s'] / 60.0, lo_abs))
            ca = cls.get('casualties')
            if ca and ca.get('first_fall_s') is not None and e_s is not None and ca['first_fall_s'] / 60.0 < e_s - EPS:
                f_ev.append('a man falls at minute %s, before the window opens (%s)' % (ca['first_fall_s'] / 60.0, e_s))
            evs = R.get('events') or {}
            if evs.get('before_earliest'):
                f_ev.append('the layer holds %d event(s) before the window opens (first: %s)' % (evs['before_earliest'], evs.get('first_before_earliest')))
            if evs.get('state_before_enter'):
                f_ev.append('%d casualty event(s) before the unit enters' % evs['state_before_enter'])
            if R.get('n_refused'):
                f_ev.append('%d event(s) of the layer were refused by the sim cache as outside the presence window (%s)' % (R['n_refused'], R.get('refused')))
            if (R.get('hidden_flag') or {}).get('mismatch_samples'):
                f_ev.append('the renderer unit table disagrees with presence at %d sample(s), first at minute %s' % (R['hidden_flag']['mismatch_samples'], R['hidden_flag'].get('first')))
            is_nof = u['status'] in NOF_STATUS or uid in nof_ids
            if is_nof and cls and any(run_start(c) is not None for c in cls.values()):
                f_abs.append('a unit listed as %s is present (gating rule 2: not drawn, or drawn only in its detached role)' % u['status'])
            conds = [cond('Q04.1: every class has zero presence before the minimum over all documented values of the arrival window (%s)' % lo_abs, not f_abs, '; '.join(f_abs[:4])),
                     cond('Q04.2: every class has zero presence before the window the scenario selects (%s)' % e_s, not f_scn, '; '.join(f_scn[:4])),
                     cond('Q04.7: no layer event, refused event, casualty or animation event (shot, smoke, march sound, command, fall) before the window opens', not f_ev, '; '.join(f_ev[:4]))]
            bad = first_failed(conds)
            ev = dict(ev0, conditions=conds, classes={k: {'first': run_start(c), 'runs': len((c or {}).get('runs') or []), 'samples': (c or {}).get('samples')} for k, c in sorted(cls.items())}, drawn=u['drawn'],
                      arrival={k: a[k] for k in ('earliest', 'default', 'latest', 'tier')} if a else None, effects=({k: fx[k] for k in ('events_before', 'first_segment_s', 'first_after_s')} if fx else None),
                      classes_not_in_product='ambulances, supply wagons, hospital contents and led horses have no model in the product: there is nothing of them to scan', grid=D['grid']['mode'])
            if bad:
                rec.item(iid, 'FAIL', 'unit %s under %s: %s' % (uid, lab, '; '.join(bad)), ev, check='Q04.1', subjects=[uid], scenario=lab, sub_requirements=sub)
                per_unit_items.setdefault(uid, []).append(('FAIL', h, lab))
            else:
                what = ('presence is zero before %s at every grid time in every class that exists (%s)' % (lo_abs, ', '.join(sorted(cls)) or 'none: the unit is not drawn, so nothing of it appears and the scan says nothing about its arrival: Q06 and Q17 debt'))
                rec.item(iid, 'PASS', 'unit %s under %s: %s' % (uid, lab, what), ev, check='Q04.1', subjects=[uid], scenario=lab, sub_requirements=sub)
                per_unit_items.setdefault(uid, []).append(('PASS', h, lab))

    # ------------------------------------------------------------------------------------------------ Q04.3 entry, Q04.4 departure (per unit, over every behaviour of the unit)
    for u in units:
        uid = u['id']
        sub = sub_requirements_for(rows, all_ids, uid, populations=('R17',))
        recs = [((D['behaviours'].get(uid) or {}).get(h), sids) for h, sids in variants_of(D, u)]
        recs = [(r, s) for r, s in recs if r is not None]
        drawn = [(r, s) for r, s in recs if (r.get('classes') or {}).get('soldiers', {}).get('samples')]
        if not drawn:
            continue
        # entry
        fe, fd = [], []
        layout_ok = u.get('slot_kind') in ('col', 'cav')
        if not layout_ok:
            fe.append('the unit enters in layout %r, not a column of march' % u.get('slot_kind'))
        for r, sids in drawn:
            fs, en = r.get('first_sample'), r.get('enter')
            if fs is None or en is None:
                fe.append('under %s: no first presence sample or no enter event' % sids[0])
                continue
            if not (abs(fs['x']) > W or abs(fs['z']) > H):
                fe.append('under %s: first presence at minute %s at (%.0f, %.0f) m, inside the loaded ground (%.0f x %.0f half extents): the unit appears deployed on the field, not as a column entering it' % (sids[0], fs['t'], fs['x'], fs['z'], W, H))
            if r.get('enter_in_box'):
                fe.append('under %s: the enter event lies inside the loaded ground' % sids[0])
            a = r.get('arrival') or {}
            if a.get('entry') is None:
                fe.append('under %s: the arrival record has no resolved entry (road and place)' % sids[0])
            elif abs(a['entry']['lng'] - en['at']['lng']) > 1e-9 or abs(a['entry']['lat'] - en['at']['lat']) > 1e-9:
                fe.append('under %s: the enter event is not at the arrival record\'s entry' % sids[0])
            if r.get('n_paths') and r.get('first_path'):
                p0 = r['first_path']['wp0']
                d = 111320.0 * ((p0['lng'] - en['at']['lng']) ** 2 * (0.7747 ** 2) + (p0['lat'] - en['at']['lat']) ** 2) ** 0.5
                if d > 1.0:
                    fe.append('under %s: the first leg starts %.1f m from the entry point (T-Q05-1: 1 m)' % (sids[0], d))
            for f in r.get('formations') or []:
                if f['t'] < en['t'] - EPS:
                    fe.append('under %s: a change of formation (%s) at minute %s precedes the entry' % (sids[0], f['formation'], f['t']))
        conds_e = [cond('the layout at entry is a column (foot column of fours or mounted column), never a line', layout_ok, 'layout %r' % u.get('slot_kind')),
                   cond('first presence is outside the loaded ground, at the entry the arrival record gives, and the first leg starts there', not fe, '; '.join(fe[:3]))]
        bad = first_failed(conds_e)
        ev = {'conditions': conds_e, 'behaviours': len(drawn), 'ground_half_extent_m': [W, H], 'formation': u.get('formation_kind')}
        rec.item('Q04/Q04.3/%s' % uid, 'FAIL' if bad else 'PASS', ('unit %s: ' % uid + '; '.join(bad)) if bad else 'unit %s enters as a column at the edge of the loaded ground in all %d behaviours (%s), never deployed' % (uid, len(drawn), 'first leg at the entry point' if any(r.get('n_paths') for r, _ in drawn) else 'it stays at the edge'),
                 ev, check='Q04.3', subjects=[uid], sub_requirements=sub)
        # departure and vanishing
        for r, sids in drawn:
            cls, lv = r['classes'], r.get('leave')
            sold = cls['soldiers']
            runs = sold['runs']
            if len(runs) > 1:
                fd.append('under %s: present in %d separate runs (%s ...): it pops out and in' % (sids[0], len(runs), runs[:3]))
            if D['grid']['mode'] == 'dense' and runs:
                end = runs[-1][1]
                if lv is None:
                    if end < battle['to'] - EPS:
                        fd.append('under %s: absent from minute %s with no leave event: it vanishes' % (sids[0], end))
                else:
                    if end > lv['t'] + EPS or end < lv['t'] - SEC - 1e-6:
                        fd.append('under %s: the leave event is at minute %s but the last presence is at %s' % (sids[0], lv['t'], end))
                    if lv.get('last_path_end') is None:
                        fd.append('under %s: leaves at minute %s with no march: the unit vanishes where it stands' % (sids[0], lv['t']))
                    elif lv.get('last_path_end_in_box'):
                        fd.append('under %s: leaves at minute %s after a march that ends inside the loaded ground (%.5f, %.5f): the unit vanishes on the field' % (sids[0], lv['t'], lv['last_path_end']['lng'], lv['last_path_end']['lat']))
                    elif lv['last_path_end'].get('t') is not None and lv['t'] < lv['last_path_end']['t'] - EPS:
                        fd.append('under %s: leaves at minute %s before the march out ends (%s)' % (sids[0], lv['t'], lv['last_path_end']['t']))
        has_leave = any(r.get('leave') for r, _ in drawn)
        rec.item('Q04/Q04.4/%s' % uid, 'FAIL' if fd else 'PASS', ('unit %s: ' % uid + '; '.join(fd[:3])) if fd else ('unit %s leaves by a march out of the loaded ground and never vanishes' % uid if has_leave else 'unit %s has no departure in the layer: one run of presence from its entry to the end of the window, nothing vanishes' % uid),
                 {'behaviours': len(drawn), 'has_leave': has_leave, 'failures': fd[:6], 'grid': D['grid']['mode']}, check='Q04.4', subjects=[uid], sub_requirements=sub)

    # ------------------------------------------------------------------------------------------------ Q04.5 unknown arrivals
    reg = K.get('register')
    for u in units:
        uid = u['id']
        b = bound.get(uid) or {}
        if u['status'] in NOF_STATUS or uid in nof_ids:
            continue
        unknown = b.get('owner') is None or b.get('tier') != TIER_DOCUMENTED or b.get('kind') in ('date_floor', 'event_floor', 'named_period_convention', 'children_min', 'none')
        if not unknown:
            continue
        sub = sub_requirements_for(rows, all_ids, uid, populations=('R17',))
        recs = [((D['behaviours'].get(uid) or {}).get(h)) for h, _ in variants_of(D, u)]
        recs = [r for r in recs if r]
        tiers = sorted({(r.get('arrival') or {}).get('tier') for r in recs if r.get('arrival')})
        firsts = [run_start(c) for r in recs for c in (r.get('classes') or {}).values() if run_start(c) is not None]
        regid = u.get('register')
        rs = register_state_light(reg, regid)
        conds = [cond('the arrival carries a tier below documented (inferred, plausible-procedural or open gap)', TIER_DOCUMENTED not in tiers, 'tiers %s' % tiers),
                 cond('an open register entry records the gap', rs['open'], '%s: %s' % (regid, rs['why'])),
                 cond('the unit is not present before the floor event of its gate', not (b.get('abs_min') is not None and firsts and min(firsts) < b['abs_min'] - EPS), 'first presence %s, floor %s' % (min(firsts) if firsts else None, b.get('abs_min')))]
        bad = first_failed(conds)
        rec.item('Q04/Q04.5/%s' % uid, 'FAIL' if bad else 'PASS', ('unit %s: ' % uid + '; '.join(bad)) if bad else 'unit %s: its arrival rests on a %s gate (%s), is shown with tier %s, appears no earlier than the floor event and has the open register entry %s' % (uid, b.get('kind'), b.get('owner'), '/'.join(tiers), regid),
                 {'conditions': conds, 'gate': {'owner': b.get('owner'), 'kind': b.get('kind'), 'tier': b.get('tier')}, 'register': rs, 'tiers_shown': tiers}, check='Q04.5', subjects=[uid], sub_requirements=sub)

    # ------------------------------------------------------------------------------------------------ Q04.6 named cases
    arr_rows = ((K.get('arrivals') or {}).get('meta') or {}).get('named_periods') or {}
    for name, prefixes in CASES:
        us = [u for u in units if under(u['id'], prefixes)]
        sub = sorted(set(rows))
        if not us:
            if sel:
                continue                                               # a partial scan: the case is judged only where some of its units were scanned
            rec.item('Q04/Q04.6/%s' % re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-'), 'BLOCKED-INPUT', 'input missing: no unit of the layer belongs to the case %s' % name, {}, check='Q04.6', sub_requirements=sub)
            continue
        iid = 'Q04/Q04.6/%s' % re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        failing = sorted({uid for u in us for (res, _, _) in per_unit_items.get(u['id'], []) if res != 'PASS' for uid in [u['id']]})
        drawn_us = [u for u in us if u['drawn']]
        # the plan's named default views: Stuart's brigades from the evening of July 2, Pickett from the morning of July 3 (the conventions of arrivals.json meta.named_periods)
        floor, floor_text, floor_bad = None, None, []
        if prefixes == STUART:
            floor, floor_text = arr_rows.get('evening', {}).get('t'), 'the evening of July 2 (start of [DUSK], sunset 19:32)'
        elif prefixes == ('cs-1c-pickett',):
            floor, floor_text = arr_rows.get('sunrise_jul3', {}).get('t'), 'the morning of July 3 (sunrise 04:36, "not shown before dawn Jul 3")'
        det = {d['unit'] for r in ((K.get('arrivals') or {}).get('rows') or []) for d in r.get('detached_roles') or []}
        if floor:
            fm = iso_min(floor)
            for u in drawn_us:
                exempt = u['id'] == 'cs-cav-hampton' or any(u['id'].startswith(d + '-') or u['id'] == d for d in det if d.startswith('cs-cav-hampton'))
                if exempt:
                    continue
                for sid in ('delegated', 'pdf'):
                    h = hash_of(D, u['id'], sid)
                    r = (D['behaviours'].get(u['id']) or {}).get(h)
                    if not r:
                        continue
                    s0 = min([run_start(c) for c in (r.get('classes') or {}).values() if run_start(c) is not None] or [None])
                    if s0 is not None and s0 < fm - EPS:
                        floor_bad.append('%s under %s is present at minute %s, before %s (%s)' % (u['id'], sid, s0, fm, floor_text))
        conds = [cond('every unit of the case (%d, %d drawn) has all its Q04.1 items PASS' % (len(us), len(drawn_us)), not failing, 'failing: %s' % failing[:6]),
                 cond('the case has at least one drawn unit (the scan says something about it)', bool(drawn_us), '%d drawn of %d' % (len(drawn_us), len(us)))]
        if floor:
            conds.append(cond('in the plan\'s default views ("pdf" and "delegated") no brigade of the case is present before %s' % floor_text, not floor_bad, '; '.join(floor_bad[:3])))
        bad = first_failed(conds)
        rec.item(iid, 'FAIL' if bad else 'PASS', ('case %s: ' % name + '; '.join(bad)) if bad else 'case %s: %d units (%d drawn) are absent before their arrival windows in every scenario of S*%s' % (name, len(us), len(drawn_us), (' and from ' + floor_text + ' in the default views') if floor else ''),
                 {'conditions': conds, 'units': [u['id'] for u in us][:40], 'n_units': len(us), 'n_drawn': len(drawn_us), 'floor': floor}, check='Q04.6', sub_requirements=sub)
    # units never or partly on the field
    nof_units = [u for u in units if u['status'] in NOF_STATUS or u['id'] in nof_ids]
    for u in nof_units:
        uid = u['id']
        recs = [((D['behaviours'].get(uid) or {}).get(h)) for h, _ in variants_of(D, u)]
        pres = [(k, run_start(c)) for r in recs if r for k, c in (r.get('classes') or {}).items() if run_start(c) is not None]
        eff = [r.get('effects') for r in recs if r and r.get('effects')]
        rec.item('Q04/Q04.6/never-on-field/%s' % uid, 'FAIL' if pres else 'PASS',
                 ('unit %s is listed as %s but is present (%s)' % (uid, u['status'], pres[:3])) if pres else 'unit %s is listed as %s and nothing of it is present at any grid time in any scenario' % (uid, u['status']),
                 {'status': u['status'], 'drawn': u['drawn'], 'render': u['render'], 'present': pres[:6]}, check='Q04.6', subjects=[uid], sub_requirements=sorted(set(rows)))
    rec.owe('Q04 picture sample: app/tests/arrival.spec.mjs on a software-GL browser at a sample of times (BT_OUT=gates-q04) confirms that the renderer\'s table equals the stage\'s; it was not run by this runner (browser jobs go through tools/horde/bench.sh)')
    rec.note('Q04.7: the sinks of an event (the effects layer fx3d and the audio planner) consume the events of the same bus; a sink cannot produce anything earlier than its cause (the audio delay d / c is not negative, Q13), so the cause is what is scanned: every event the real AnimSystem emits for the unit before its window opens')
    rec.note('S*: the Cartesian product is taken inside each interaction group (conflicts that bear on a common unit, by the rule of ArrivalModel.effective); every conflict outside a group stays on its delegated default; the factorisation is checked on every scenario, not assumed')
    return complete


def register_state_light(reg, eid):
    if reg is None:
        return {'open': False, 'why': 'input missing: register_index.json'}
    e = reg.get(eid)
    if not eid:
        return {'open': False, 'why': 'the unit names no register entry'}
    if e is None:
        return {'open': False, 'why': 'no such entry in register_index.json'}
    return {'open': e.get('status') in ('open', 'awaiting owner'), 'why': 'status %s' % e.get('status'), 'status': e.get('status')}


# ---------------------------------------------------------------------------------------------------- driver
def run(env, dump=None, inputs=None, write=True, mutate=None, argv=None, extra=()):
    rec = Record(GATE, env, renderer_class='node', argv=argv)
    rec.tool_versions['node'] = node_version()
    D = dump if dump is not None else layer_dump(env, 'q04_arrival.mjs', list(extra), mutate=mutate, timeout=6 * 3600)
    K = inputs if inputs is not None else load_inputs(rec, env, D['units'])
    rec.extra['time_grid'] = {'step_s': 60, 'boundaries': True, 'mode': D['grid']['mode'], 'fraction_done': 1.0 if D['grid']['mode'] == 'dense' and D['scenario_set'].get('complete') else 0.0}
    rec.extra['scenario_set'] = {'id': D['scenario_set']['id'], 'count': D['scenario_set']['count'], 'groups': D['scenario_set']['groups']}
    rec.extra['cross_check_with_check_arrivals'] = (K.get('cross') or {})
    register_inputs(rec, env, D, node_files=('tools/bt/gates/q04_arrival.mjs',))
    evaluate(rec, env, D, K)
    out = rec.finish()
    if write:
        rec.write(out)
    return rec, out


def main(argv=None):
    ap = base_parser(__doc__.split('\n')[0])
    ap.add_argument('--mutate', default=None, help='test hook: a module that injects a defect into the real pipeline (see q456_lib.mjs)')
    ap.add_argument('--dump', default=None, help='judge a dump the node child wrote earlier instead of running the child')
    ap.add_argument('--scenarios', default='S*', choices=['S*', 'default'])
    ap.add_argument('--grid', default='dense', choices=['dense', 'coarse'])
    ap.add_argument('--units', default=None, help='comma list of unit ids (a partial scan: INCOMPLETE)')
    a = ap.parse_args(argv)
    env = Env(root=a.root, out=a.out)
    dump = None
    if a.dump:
        with open(a.dump, encoding='utf-8') as f:
            dump = json.load(f)
    extra = ['--scenarios', a.scenarios, '--grid', a.grid] + (['--units', a.units] if a.units else [])
    rec, out = run(env, dump=dump, write=not a.no_write, mutate=a.mutate, argv=['python3', 'tools/bt/gates/q04_arrival.py'] + list(argv if argv is not None else sys.argv[1:]), extra=extra)
    if not a.quiet:
        c = out['counts']
        print('Q04 verdict %s: %d items, PASS %d, COVERED %d, FAIL %d, NOT-RUN %d, BLOCKED-INPUT %d, N/A %d' % (out['verdict'], out['totals']['items'], c['PASS'], c['COVERED'], c['FAIL'], c['NOT-RUN'], c['BLOCKED-INPUT'], c['N/A']))
    return {'PASS': 0, 'FAIL': 1, 'INCOMPLETE': 2}[out['verdict']]


if __name__ == '__main__':
    guarded_main(main)
