#!/usr/bin/env python3
"""Gate Q05: "Position-time plausibility: speeds on foot, horse, limber, wagon and in column within documented ranges; no teleport; continuous trajectories." (plan p. 136, Q). GATE-SPEC.md 2, Q05.1 to Q05.5.

    python3 tools/bt/gates/q05_speed.py [--out DIR] [--dump FILE] [--scenarios S*|default] [--grid dense|coarse] [--mutate FILE.mjs] [--no-write] [--quiet]

Writes `<out>/Q05.json` (default GOVERNANCE/gate_results), record `bt-gate-result/1`. Exit code 0 PASS, 1 FAIL, 2 INCOMPLETE, 3 runner error. It sets no `passes` flag.

The node child q05_speed.mjs measures the REAL product over S*: every path the layer gives a unit (length, mean speed and fastest segment, declared gait, where it starts and ends), the stage's own turn of every change
of heading (the stage's reducer, the turn time it gives, the figure farthest from the origin: soldiers, gun pieces and crews), the Stage's positions at every integer minute and one second either side of every leg
boundary, and the draw lists of the artillery train every 5 s while a battery moves or turns. This runner judges them against the documented figures it reads itself (app/data/anim3d/drill-timing.json: the
Hardee and Casey cadences and steps; gait-sources.json: Wheeler 1863, Cooper 1861 and the Instruction for Field Artillery 1863; both are inputs with hashes) and the recorded thresholds (DD-G01).

  Q05.1  speed ranges    foot: no segment above the urgent double quick (180 steps of 33 in.); a leg declared `march` has a mean speed inside [common time, quick time], a leg declared `double_quick` inside
                         [double quick, urgent double quick] (A-32, X-10: the lower bound for a declared constant-gait segment); cavalry mounts: no segment above the slowest documented gallop of the three bases
  Q05.2  no teleport     between two consecutive samples at which a unit (or a gun piece) is present, the displacement is at most v_max x dt plus the position resolution (T-Q05-1: 1 m)
  Q05.3  continuity      each leg starts where the one before ended within 1 m (or at the unit's entry), never before it ended; the far end of a turning formation (the stage's rigid turn) moves no faster than the class
                         bound (column: sqrt(v^2 + (omega r)^2) with omega the peak angular rate of the smoothstep turn)
  Q05.4  time vs rate    a documented time that the documented rate cannot meet: the layer keeps the bound and reports the lateness (layer.report offsets); COVERED when an open register entry holds it (the verdict stays INCOMPLETE, K3)
  Q05.5  missing ranges  a mover class with no documented range (limbers, caissons, wagons and the forge, gun pieces on the road, a cavalry column at the foot march rate): BLOCKED-INPUT until an open L3 register entry
                         exists; the conservative bound (the foot range) is applied meanwhile and a measure above it is FAIL

An item is (unit, behaviour of the unit under the scenarios of S*) as in Q04. A run on the coarse grid or on a part of S* is INCOMPLETE and never PASS.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (HERE, os.path.join(HERE, 'lib'), os.path.abspath(os.path.join(HERE, '..'))):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from oobgates_common import cond, covered_by_register, first_failed, gate_rows, layer_dump, register_state, sub_requirements_for  # noqa: E402
from pq_common import Env, InputMissing, Record, base_parser, guarded_main, node_version  # noqa: E402

GATE = 'Q05'
FACTOR = 1.0001                       # T-Q05-2 (DD-G01): the upper bound is exact up to the rounding factor 1.0001
JOIN_M = 1.0                          # T-Q05-1 (DD-G01): path joins and position resolution
NOF = ('never_on_field', 'never_main_field', 'documented_absent')
Q05_5_ENTRIES = {'cavalry-mount': ['EG-ANIM-07'], 'limber': [], 'caisson': [], 'wagon-forge': [], 'gun-piece': []}      # open register entries that hold a missing range; none of them has a dated search log (L3) today
VEHICLE_LISTS = {'limbers': 'limber', 'caissons': 'caisson', 'wagons': 'wagon-forge', 'guns': 'gun-piece'}
TEAM_LISTS = ('horses', 'drivers')


def documented(rec, env):
    """The documented figures: Hardee and Casey cadences and steps (drill-timing.json) and the gait tables (gait-sources.json), read as inputs."""
    dt = rec.read_json(env.btp('app/data/anim3d/drill-timing.json'), 'data')
    gs = rec.read_json(env.btp('app/data/anim3d/gait-sources.json'), 'data')
    m = dt['march']
    march = [min(m['common_time']['speedMs'], m['quick_time']['speedMs'], m['route_step']['speedMs']), max(m['common_time']['speedMs'], m['quick_time']['speedMs'], m['route_step']['speedMs'])]
    dq = [m['double_quick']['speedMs'], m['double_quick_urgent']['speedMs']]
    bases = {k: v['speeds_ms'] for k, v in gs['bases'].items() if v.get('speeds_ms')}
    return {'foot': {'march': march, 'double_quick': dq, 'upper': dq[1], 'sources': {'march': m['common_time']['src'] + m['quick_time']['src'] + m['route_step']['src'], 'double_quick': m['double_quick']['src'] + m['double_quick_urgent']['src']}},
            'cavalry': {'upper': min(b['gallop'] for b in bases.values()), 'bases': {k: dict(v) for k, v in bases.items()}, 'walk_range': [min(b['walk'] for b in bases.values()), max(b['walk'] for b in bases.values())]},
            'team': {'upper': bases['fa_1863']['gallop'], 'basis': 'fa_1863 (Instruction for Field Artillery 1863, p. 47: a horse travels 400 yards at a gallop in 1 minute)'}}


def evaluate(rec, env, D, K):
    units_all = D['units']
    sel = set(D.get('selected_units') or [])
    units = [u for u in units_all if not sel or u['id'] in sel]            # a partial scan judges the units it scanned (and is INCOMPLETE)
    by = {u['id']: u for u in units_all}
    rows, all_ids = gate_rows(env, GATE)
    dense = D['grid']['mode'] == 'dense'
    ss = D['scenario_set']
    if not dense:
        rec.incomplete('the time grid is the coarse test grid, not every integer minute plus the boundaries (GATE-SPEC 1.5, U-26)')
    if not ss.get('complete'):
        rec.incomplete('the scenario set scanned is not the whole of S* (%s, %d scenarios)' % (ss.get('id'), ss.get('count', 0)))
    if D.get('selected_units'):
        rec.incomplete('the scan was restricted to %d selected unit(s)' % len(D['selected_units']))
    if not D.get('train_run'):
        rec.incomplete('the artillery train (limbers, caissons, wagons, teams) was not measured in this record')
    if K.get('missing'):
        rec.incomplete('input missing: %s' % K['missing'])
    rec.threshold('T-Q05-1', JOIN_M, 'DD-G01', 'path joins and position resolution, metres')
    rec.threshold('T-Q05-2', FACTOR, 'DD-G01', 'upper bound of a speed class: the documented figure times this rounding factor')
    rec.threshold('T-Q06-1', 90, 'DD-G01', 'deployment duration in seconds (plausible-procedural until a manual figure is read): used by Q06, recorded here for the shared bounds')
    doc = K.get('doc')
    fz = ss.get('factorisation') or {}
    bad_f = list(fz.get('violations') or []) + [j for j in (fz.get('joint') or []) if j.get('n_mismatch')]
    g_ev = {'groups': ss.get('groups'), 'count': ss.get('count'), 'violations': fz.get('violations'), 'joint': fz.get('joint'), 'rule': fz.get('rule'), 'complete': ss.get('complete')}
    if bad_f:
        rec.item('Q05/S*/factorisation', 'FAIL', 'a unit behaves differently in a scenario of S* without depending on a conflict the scenario varies, or a joint scenario differs from the product of its groups: %s' % json.dumps(bad_f)[:300], g_ev, check='Q05.S*', sub_requirements=rows)
    elif not ss.get('complete'):
        rec.item('Q05/S*/factorisation', 'NOT-RUN', 'the scenario set of this run is %s (%d scenarios), not S*' % (ss.get('id'), ss.get('count', 0)), g_ev, check='Q05.S*', sub_requirements=rows)
    else:
        rec.item('Q05/S*/factorisation', 'PASS', 'S* has %d scenarios in %d interaction groups; every scenario changes only the units that depend on a conflict it varies and the joint scenarios equal the product of the groups' % (ss['count'], len(ss['groups'])), g_ev, check='Q05.S*', sub_requirements=rows)
    for sc in D['scans']:
        if not sc.get('scanned_units'):
            continue
        grid = sc.get('grid') or {}
        ok_grid = grid.get('mode') == 'dense' and (grid.get('samples') or 0) >= (grid.get('integer_minutes') or 1)
        if sc.get('refused_total'):
            rec.item('Q05/scan/%s' % sc['scenario'], 'FAIL', 'scan of %s: %d event(s) of the layer were refused by the sim cache' % (sc['scenario'], sc['refused_total']), {'grid': grid}, check='Q05.scan', scenario=sc['scenario'], sub_requirements=rows)
        elif not ok_grid:
            rec.item('Q05/scan/%s' % sc['scenario'], 'NOT-RUN', 'scan of %s: the grid is %s (%s samples for %s integer minutes), not every integer minute plus the boundaries: never a PASS' % (sc['scenario'], grid.get('mode'), grid.get('samples'), grid.get('integer_minutes')), {'grid': grid}, check='Q05.scan', scenario=sc['scenario'], sub_requirements=rows)
        else:
            rec.item('Q05/scan/%s' % sc['scenario'], 'PASS', 'scan of %s: %d unit(s), %s samples (every integer minute and the boundaries), no event refused' % (sc['scenario'], sc['scanned_units'], grid.get('samples')), {'grid': grid}, check='Q05.scan', scenario=sc['scenario'], sub_requirements=rows)
    if doc is None:
        for u in units:
            if u['drawn']:
                rec.item('Q05/Q05.1/%s' % u['id'], 'BLOCKED-INPUT', 'input missing: %s (the documented speeds of the drill manuals and the gait tables)' % K.get('missing'), {}, check='Q05.1', subjects=[u['id']], sub_requirements=rows)
        return
    # the node child reads the same files: its bounds must be the ones read here
    nb = D.get('bounds') or {}
    mism = [k for k, v in (('foot_upper', doc['foot']['upper']), ('cavalry_upper', doc['cavalry']['upper']), ('team_upper', doc['team']['upper'])) if abs((nb.get(k) or 0) - v) > 1e-9]
    if mism:
        rec.item('Q05/bounds', 'FAIL', 'the node child and the judge read different documented bounds: %s' % mism, {'node': nb, 'judge': {k: doc[k]['upper'] for k in ('foot', 'cavalry', 'team')}}, check='Q05.1', sub_requirements=rows)
    legs_by_class = {'foot': 0, 'cavalry': 0}
    veh_max = {c: {'max_ms': 0.0, 'unit': None, 'at': None} for c in set(VEHICLE_LISTS.values())}
    cav_legs = []
    for u in units:
        uid = u['id']
        if not u['drawn']:
            continue
        sub = sub_requirements_for(rows, all_ids, uid, populations=('R17',))
        cav = u['arm'] == 'cavalry'
        cls = 'cavalry mount' if cav else 'foot column'
        upper = (doc['cavalry']['upper'] if cav else doc['foot']['upper']) * FACTOR
        sids_of = {}
        for sid in D['scenarios']:
            h = (D['hashes']['scenarios'].get(sid) or {}).get(uid) or D['hashes']['default'][uid]
            sids_of.setdefault(h, []).append(sid)
        used = set()
        for h, sids in sids_of.items():
            R = (D['behaviours'].get(uid) or {}).get(h)
            first = sids[0]
            sc = D['scenarios'][first]
            lab = 'delegated' if first == 'delegated' else first if sc['kind'] == 'named' else (','.join('%s=%s' % (c, sc['choices'][c]) for c in (u.get('deps') or [])) or 'delegated')
            while lab in used:
                lab += '#'
            used.add(lab)
            base = {'scenarios': sids[:12], 'n_scenarios': len(sids), 'hash': h, 'class': cls, 'bound_ms': round(upper, 6)}
            if R is None:
                for chk in ('Q05.1', 'Q05.2', 'Q05.3'):
                    rec.item('Q05/%s/%s/%s' % (chk, uid, lab), 'BLOCKED-INPUT', 'input missing: the node scan holds no record of this unit under behaviour %s' % h, base, check=chk, subjects=[uid], scenario=lab, sub_requirements=sub)
                continue
            legs, joins, turns, step = R['legs'], R['joins'], R['turns'], R['step']
            # ---- Q05.1
            f1, ranges = [], []
            for l in legs:
                if l['zero_time_moves']:
                    f1.append('leg %d moves %d segment(s) in no time (a jump inside a path)' % (l['i'], l['zero_time_moves']))
                if l['max_seg_ms'] is not None and l['max_seg_ms'] > upper:
                    f1.append('leg %d (%s, minute %.2f) has a segment at %.4f m/s, above the %s bound %.4f m/s' % (l['i'], l['gait'], l['t0'], l['max_seg_ms'], cls, upper))
                if not cav:
                    g = l['gait']
                    rg = doc['foot'].get(g) if g in ('march', 'double_quick') else None
                    if rg is None:
                        f1.append('leg %d has no declared gait (%r): the speed cannot be set against a documented range' % (l['i'], g))
                    elif l['mean_ms'] is not None and not (rg[0] * (2 - FACTOR) <= l['mean_ms'] <= rg[1] * FACTOR):
                        f1.append('leg %d is declared %s with a mean speed of %.4f m/s, outside the documented range [%.4f, %.4f] m/s of that gait' % (l['i'], g, l['mean_ms'], rg[0], rg[1]))
                    ranges.append({'leg': l['i'], 'gait': g, 'mean_ms': l['mean_ms'], 'range': rg})
                else:
                    cav_legs.append({'unit': uid, 'scenario': lab, 'leg': l['i'], 'mean_ms': l['mean_ms'], 'gait': l['gait']})
            tr = R.get('train')
            if tr:
                for lname in TEAM_LISTS:
                    mx = tr['lists'][lname]['max_ms']
                    if mx > doc['team']['upper'] * FACTOR:
                        f1.append('the teams of horses (%s) move at %.3f m/s, above the documented gallop %.3f m/s (%s)' % (lname, mx, doc['team']['upper'], doc['team']['basis']))
                for lname, klass in VEHICLE_LISTS.items():
                    mx = tr['lists'][lname]['max_ms']
                    if mx > veh_max[klass]['max_ms']:
                        veh_max[klass] = {'max_ms': mx, 'unit': uid, 'at': tr['lists'][lname]['at'], 'scenario': lab}
            conds = [cond('no segment of any leg is above the %s bound %.4f m/s (documented %s, x %s)' % (cls, upper, 'urgent double quick, 180 x 33 in.' if not cav else 'slowest documented gallop of Wheeler, Cooper and the Instruction for Field Artillery', FACTOR), not [x for x in f1 if 'above the' in x and 'segment' in x], '; '.join(f1[:3])),
                     cond('every leg of a foot unit declares a gait and its mean speed is inside the documented range of that gait (both ends)', not [x for x in f1 if 'declared' in x or 'no declared gait' in x], '; '.join([x for x in f1 if 'declared' in x or 'no declared gait' in x][:3])),
                     cond('no jump inside a path and the teams of horses are below the documented gallop', not [x for x in f1 if 'no time' in x or 'teams' in x], '; '.join([x for x in f1 if 'no time' in x or 'teams' in x][:3]))]
            bad = first_failed(conds)
            ev1 = dict(base, legs=[{k: l[k] for k in ('i', 't0', 't1', 'length_m', 'mean_ms', 'max_seg_ms', 'min_seg_ms', 'gait', 'tier')} for l in legs][:40], n_legs=len(legs), ranges=ranges[:40], conditions=conds,
                       documented={'foot': {k: doc['foot'][k] for k in ('march', 'double_quick', 'upper')}, 'cavalry_upper': doc['cavalry']['upper'], 'team_upper': doc['team']['upper']}, train=({k: v['max_ms'] for k, v in tr['lists'].items()} if tr else None))
            rec.item('Q05/Q05.1/%s/%s' % (uid, lab), 'FAIL' if bad else 'PASS', ('unit %s under %s: ' % (uid, lab) + '; '.join(bad)) if bad else 'unit %s under %s: %d leg(s) within the documented ranges of %s' % (uid, lab, len(legs), cls), ev1, check='Q05.1', subjects=[uid], scenario=lab, sub_requirements=sub)
            # ---- Q05.2
            f2 = []
            if step['n_over']:
                f2.append('%d consecutive pair(s) of samples at which the unit is present are farther apart than %s m/s x dt + %s m, e.g. %s' % (step['n_over'], round(upper, 4), JOIN_M, step['offenders'][:2]))
            gs_ = R.get('gun_step')
            if gs_ and gs_['n_over']:
                f2.append('%d pair(s) of samples at which a gun piece of the unit is on the field are farther apart than the bound allows' % gs_['n_over'])
            if step['pairs'] == 0 and legs:
                f2.append('the unit has legs but is present at no two consecutive samples')
            ev2 = dict(base, step=step, gun_step=gs_, resolution_m=JOIN_M, grid=D['grid']['mode'])
            rec.item('Q05/Q05.2/%s/%s' % (uid, lab), 'FAIL' if f2 else 'PASS', ('unit %s under %s: ' % (uid, lab) + '; '.join(f2)) if f2 else 'unit %s under %s: the largest step between two samples is %.4f m/s over %d pairs; no teleport' % (uid, lab, step['max'], step['pairs']), ev2, check='Q05.2', subjects=[uid], scenario=lab, sub_requirements=sub)
            # ---- Q05.3
            f3 = []
            for j in joins:
                if j['d_m'] is not None and j['d_m'] > JOIN_M:
                    f3.append('leg %d starts %.2f m from where %s ended (T-Q05-1: %s m)' % (j['i'], j['d_m'], 'the leg before' if j['after'] == 'leg' else 'the entry', JOIN_M))
                if j['gap_s'] is not None and j['gap_s'] < -1e-3:
                    f3.append('leg %d starts %.1f s before %s ended: the unit is in two places' % (j['i'], -j['gap_s'], 'the leg before' if j['after'] == 'leg' else 'its entry'))
            worst = None
            for t in turns:
                if t['edge_peak_ms'] > upper:
                    f3.append('the turn at minute %.2f (%.1f degrees in %.0f s, far end %.0f m from the origin) moves its far end at %.2f m/s, above %s' % (t['t'], t['dA'] * 57.29578, t['turn_s'], t['r_m'], t['edge_peak_ms'], round(upper, 4)))
                if worst is None or t['edge_peak_ms'] > worst['edge_peak_ms']:
                    worst = t
            if len(f3) > 6:
                n_more = len(f3) - 4
                f3 = f3[:4] + ['and %d more turns or joins' % n_more]
            ev3 = dict(base, joins=joins[:40], n_turns=len(turns), turns_over=len([t for t in turns if t['edge_peak_ms'] > upper]), worst_turn=worst, extent_m=R.get('extent_m'), stage=(D.get('product') or {}).get('stage'))
            rec.item('Q05/Q05.3/%s/%s' % (uid, lab), 'FAIL' if f3 else 'PASS', ('unit %s under %s: ' % (uid, lab) + '; '.join(f3)) if f3 else 'unit %s under %s: %d legs join within %s m and never overlap; %d turns, the far end never moves faster than %.4f m/s' % (uid, lab, len(legs), JOIN_M, len(turns), upper), ev3, check='Q05.3', subjects=[uid], scenario=lab, sub_requirements=sub)
            # ---- Q05.4: lateness the layer keeps as an offset
            reg = register_state(env, u.get('register')) if u.get('register') else None
            for k, o in enumerate(R.get('offsets') or []):
                late = o.get('late_min') or 0
                if late <= 0:
                    continue
                kept = not any('above the' in x and 'segment' in x for x in f1)
                held = bool(reg and reg['open'])
                nm = '%s/%s/%s' % (o.get('list'), o.get('kind'), o.get('stop') or o.get('claim') or k)
                why = []
                if not kept:
                    why.append('the layer exceeds the speed bound to meet the time')
                if not held:
                    why.append('no open register entry holds the lateness (%s)' % (u.get('register')))
                ev4 = dict(base, offset=o, register=reg)
                if why:
                    rec.item('Q05/Q05.4/%s/%s/%s' % (uid, lab, nm), 'FAIL', 'unit %s under %s, %s: %d min late: %s' % (uid, lab, nm, late, '; '.join(why)), ev4, check='Q05.4', subjects=[uid], scenario=lab, sub_requirements=sub)
                else:
                    rec.item('Q05/Q05.4/%s/%s/%s' % (uid, lab, nm), 'COVERED', 'unit %s under %s, %s: the documented time cannot be met at the documented rate: the layer keeps the bound, reports %d minutes of lateness and the open register entry %s holds it (COVERED: the verdict stays INCOMPLETE, K3)' % (uid, lab, nm, late, u.get('register')), ev4, check='Q05.4', subjects=[uid], scenario=lab, sub_requirements=sub)
    # ---- Q05.5: classes with no documented range
    cons = doc['foot']['upper'] * FACTOR
    for klass, ids in sorted(Q05_5_ENTRIES.items()):
        if klass == 'cavalry-mount':
            ls = [c for c in cav_legs if c['mean_ms'] is not None]
            if not ls:
                continue
            lo, hi = doc['cavalry']['walk_range']
            under = [c for c in ls if c['mean_ms'] < lo * (2 - FACTOR)]
            measured = {'legs': len(ls), 'slowest_ms': min(c['mean_ms'] for c in ls), 'fastest_ms': max(c['mean_ms'] for c in ls), 'documented_walk_ms': [lo, hi], 'below_documented_walk': len(under), 'declared_gaits': sorted({c['gait'] for c in ls if c['gait']})}
            over = measured['fastest_ms'] > cons
            what = 'a cavalry column moves at the foot march rate (%.3f to %.3f m/s, a model parameter: the layer says "Cavalry has no rate in the repository") while the documented walks of the manuals are %.3f to %.3f m/s: no documented range contains the declared gait' % (measured['slowest_ms'], measured['fastest_ms'], lo, hi)
        else:
            m = veh_max[klass]
            if not m['unit']:
                continue
            measured = dict(m)
            over = m['max_ms'] > cons
            what = 'no documented range of movement exists for the %s (the plan gives none for limbers or wagons and the gait tables are for horses); the fastest measured entity moves at %.3f m/s' % (klass, m['max_ms'])
        ok, reasons, states = covered_by_register(env, ids)
        ev5 = {'class': klass, 'measured': measured, 'conservative_bound_ms': round(cons, 6), 'register_ids': ids, 'register': [{'id': s['id'], 'open': s['open'], 'link_level': s.get('link_level')} for s in states], 'reasons': reasons}
        iid = 'Q05/Q05.5/%s' % klass
        if over:
            rec.item(iid, 'FAIL', '%s; the conservative bound (the foot range, tier inferred) is %.4f m/s and the class is above it' % (what, cons), ev5, check='Q05.5', sub_requirements=rows, register_ids=ids)
        elif ok:
            rec.item(iid, 'COVERED', '%s; an open register entry of level L3 holds the gap and the conservative bound is respected (COVERED until a source is read; the verdict stays INCOMPLETE, K3)' % what, ev5, check='Q05.5', sub_requirements=rows, register_ids=ids)
        else:
            rec.item(iid, 'BLOCKED-INPUT', 'input missing: a documented range of movement for the class %s: %s; %s' % (klass, what, '; '.join(reasons) or 'no register entry names this gap'), ev5, check='Q05.5', sub_requirements=rows, register_ids=ids)
    rec.owe('Q05.5: a documented rate of movement for limbers, caissons, wagons and the forge, gun pieces on the road and a cavalry column (the Instruction for Field Artillery 1863 and Wheeler 1863 give horse speeds, not vehicle or column rates) and an open L3 register entry with a dated search log for each class (GATE-SPEC 1.4)')
    rec.note('Q05.1: the documented upper bound of foot movement is the urgent double quick, 180 steps a minute of 33 inches (drill-timing.json double_quick_urgent, Hardee para 114; the step is inferred, the cadence documented); the 165-step double quick (2.305 m/s) is the lower end of the double-quick range. Horses: the manuals give point speeds for walk, trot and gallop, so only an upper bound exists; the slowest documented gallop of the three bases is the bound (the sources conflict: each is a selectable basis)')
    rec.note('Q05.3: the turn of a formation is the stage\'s rigid rotation about the unit\'s origin; the far end of a column moves perpendicular to the unit\'s advance, so its speed is sqrt(v^2 + (omega r)^2) with omega the peak rate of the smoothstep turn (1.5 x angle / turn time); the sum v + omega r is carried in the evidence')


def load_inputs(rec, env):
    K = {}
    try:
        K['doc'] = documented(rec, env)
    except (InputMissing, KeyError) as e:
        K['doc'] = None
        K['missing'] = str(e)
    return K


def run(env, dump=None, inputs=None, write=True, mutate=None, argv=None, extra=()):
    rec = Record(GATE, env, renderer_class='node', argv=argv)
    rec.tool_versions['node'] = node_version()
    D = dump if dump is not None else layer_dump(env, 'q05_speed.mjs', list(extra), mutate=mutate, timeout=6 * 3600)
    K = inputs if inputs is not None else load_inputs(rec, env)
    rec.extra['time_grid'] = {'step_s': 60, 'boundaries': True, 'mode': D['grid']['mode'], 'fraction_done': 1.0 if D['grid']['mode'] == 'dense' and D['scenario_set'].get('complete') else 0.0}
    rec.extra['scenario_set'] = {'id': D['scenario_set']['id'], 'count': D['scenario_set']['count'], 'groups': D['scenario_set']['groups']}
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
    rec, out = run(env, dump=dump, write=not a.no_write, mutate=a.mutate, argv=['python3', 'tools/bt/gates/q05_speed.py'] + list(argv if argv is not None else sys.argv[1:]), extra=extra)
    if not a.quiet:
        c = out['counts']
        print('Q05 verdict %s: %d items, PASS %d, COVERED %d, FAIL %d, NOT-RUN %d, BLOCKED-INPUT %d, N/A %d' % (out['verdict'], out['totals']['items'], c['PASS'], c['COVERED'], c['FAIL'], c['NOT-RUN'], c['BLOCKED-INPUT'], c['N/A']))
    return {'PASS': 0, 'FAIL': 1, 'INCOMPLETE': 2}[out['verdict']]


if __name__ == '__main__':
    guarded_main(main)
