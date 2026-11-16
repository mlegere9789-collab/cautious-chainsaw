#!/usr/bin/env python3
"""Gate Q06: "March-to-position check. Every unit has a continuous documented or inferred path from its previous position to its fighting position; no unit appears already deployed." (plan p. 136, Q). GATE-SPEC.md 2, Q06.1 to Q06.5.

    python3 tools/bt/gates/q06_path.py [--out DIR] [--dump FILE] [--scenarios S*|default] [--mutate FILE.mjs] [--no-undrawn-check] [--no-write] [--quiet]

Writes `<out>/Q06.json` (default GOVERNANCE/gate_results), record `bt-gate-result/1`. Exit code 0 PASS, 1 FAIL, 2 INCOMPLETE, 3 runner error. It sets no `passes` flag.

The node child q06_path.mjs reads the REAL layer (and the world built from it) and reports, for every leaf unit under every scenario of S*, the plan the placement module made of it, its road of approach, every leg it is given
(times, ends, rate, tier, sources), the joins between legs and with the entry, where the last leg ends against the unit's own fighting position (layer.slotOf), the entry, the layout and the changes of formation, and the
departure. This runner judges them.

  Q06.1  chain           a leg from the entry to the fighting position and legs between, joined within 1 m (T-Q05-1), never overlapping in time, every leg with a tier and sources and a rate within the documented bound
                         (Q05), the road of approach with its tier, the last leg ending at the unit's fighting position
  Q06.2  not deployed    the unit is built in a column (foot column of fours or mounted column); a change of formation comes after the unit has marched to its place; the duration of the change is the shell's tuning value (90 s,
                         T-Q06-1: no manual figure is in the repository), plausible-procedural, so the tier shown may not be better and an open register entry must hold it (BLOCKED-INPUT until one exists)
  Q06.3  every unit      every leaf unit of the layer that was on the field has a chain: a unit the layer does not draw, or draws only where its road leaves the ground, has no path and is FAIL (X-20: a path can always be
                         inferred; "too many units" is never a reason); the research files of history/undrawn are read as inputs: what they hold, what the checker (check_undrawn.py --all) says of them, and that the layer
                         has not consumed them
  Q06.4  departure       a unit that leaves does so by a march that starts where it last stood and ends outside the loaded ground
  Q06.5  outside the map the entry is on the unit's road of approach, outside the loaded ground, at the place and time the arrival record gives

An item is (unit, behaviour of the unit under the scenarios of S*), as in Q04 and Q05. No COVERED branch (the gate text itself allows "documented or inferred").
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (HERE, os.path.join(HERE, 'lib'), os.path.abspath(os.path.join(HERE, '..'))):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from oobgates_common import cond, covered_by_register, first_failed, gate_rows, layer_dump, sub_requirements_for  # noqa: E402
from pq_common import Env, InputMissing, Record, base_parser, guarded_main, node_version  # noqa: E402
from q05_speed import documented  # noqa: E402

GATE = 'Q06'
JOIN_M = 1.0                           # T-Q05-1 (DD-G01)
FACTOR = 1.0001                        # T-Q05-2 (DD-G01)
DEPLOY_S = 90                          # T-Q06-1 (DD-G01): the shell's tuning value of DEC-008, plausible-procedural until a manual figure is read
NOF = ('never_on_field', 'never_main_field', 'documented_absent')
TIER_RANK = {'documented': 3, 'inferred': 2, 'plausible-procedural': 1, 'open gap': 0}
Q06_2_ENTRIES = []                     # open register entries of level L1 or more that hold the deployment duration (none exists today: DEC-008 is a decision, not a register entry)
GROUPS = ('us-1c-1d-art', 'us-1c-2d-3d', 'us-2c-1d-art', 'us-hq-artres')


def undrawn_inputs(rec, env, run_checker):
    """The research files of history/undrawn read as inputs: per unit the records they hold by kind, and (once) the checker's verdict. Never an item's result (U-28)."""
    und = os.path.join(env.bt, 'history', 'undrawn')
    out = {'files': {}, 'by_unit': {}, 'status': {}, 'checker': None}
    try:
        st = rec.read_json(os.path.join(und, 'status.json'), 'data')
        out['status'] = {u['id']: u for u in st.get('units', [])}
    except InputMissing as e:
        out['missing'] = str(e)
    for g in GROUPS:
        fn = os.path.join(und, g + '.jsonl')
        try:
            rows = rec.read_jsonl(fn, 'data')
        except InputMissing:
            out['files'][g] = {'present': False}
            continue
        out['files'][g] = {'present': True, 'records': len(rows)}
        for r in rows:
            u = r.get('unit_id')
            if isinstance(u, str):
                d = out['by_unit'].setdefault(u, {})
                d[r.get('kind')] = d.get(r.get('kind'), 0) + 1
    if run_checker:
        chk = os.path.join(und, 'tools', 'check_undrawn.py')
        if os.path.isfile(chk):
            try:
                p = subprocess.run([sys.executable, '-I', chk, '--all'], capture_output=True, text=True, timeout=900, encoding='utf-8', errors='replace')
                files = {}
                for ln in p.stdout.splitlines():
                    m = re.match(r'^(\S+)\.jsonl: (\d+) records, (\d+) units named, (\d+) errors, (\d+) warnings', ln)
                    if m:
                        files[m.group(1)] = {'records': int(m.group(2)), 'units_named': int(m.group(3)), 'errors': int(m.group(4)), 'warnings': int(m.group(5))}
                out['checker'] = {'command': 'python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py --all', 'exit': p.returncode, 'files': files}
            except (OSError, subprocess.SubprocessError) as e:
                out['checker'] = {'error': str(e)[:200]}
    return out


def load_inputs(rec, env, run_checker=True):
    K = {}
    try:
        K['doc'] = documented(rec, env)
    except (InputMissing, KeyError) as e:
        K['doc'] = None
        K['missing'] = str(e)
    K['undrawn'] = undrawn_inputs(rec, env, run_checker)
    return K


def labels(D, u):
    out = {}
    for sid in D['scenarios']:
        h = (D['hashes']['scenarios'].get(sid) or {}).get(u['id']) or D['hashes']['default'][u['id']]
        out.setdefault(h, []).append(sid)
    used, res = set(), []
    for h, sids in out.items():
        sc = D['scenarios'][sids[0]]
        lab = 'delegated' if sids[0] == 'delegated' else sids[0] if sc['kind'] == 'named' else (','.join('%s=%s' % (c, sc['choices'][c]) for c in (u.get('deps') or [])) or 'delegated')
        while lab in used:
            lab += '#'
        used.add(lab)
        res.append((h, sids, lab))
    return res


def evaluate(rec, env, D, K):
    units_all = D['units']
    sel = set(D.get('selected_units') or [])
    units = [u for u in units_all if not sel or u['id'] in sel]
    rows, all_ids = gate_rows(env, GATE)
    ss = D['scenario_set']
    if not ss.get('complete'):
        rec.incomplete('the scenario set scanned is not the whole of S* (%s, %d scenarios)' % (ss.get('id'), ss.get('count', 0)))
    if D.get('selected_units'):
        rec.incomplete('the scan was restricted to %d selected unit(s)' % len(D['selected_units']))
    if K.get('missing'):
        rec.incomplete('input missing: %s' % K['missing'])
    rec.threshold('T-Q05-1', JOIN_M, 'DD-G01', 'path joins, metres')
    rec.threshold('T-Q05-2', FACTOR, 'DD-G01', 'rate bound factor (the rate of every leg is Q05\'s)')
    rec.threshold('T-Q06-1', DEPLOY_S, 'DD-G01', 'deployment duration in seconds: the shell\'s tuning value (DEC-008), plausible-procedural, marked and registered until a manual figure is read')
    doc = K.get('doc')
    fz = ss.get('factorisation') or {}
    bad_f = list(fz.get('violations') or []) + [j for j in (fz.get('joint') or []) if j.get('n_mismatch')]
    g_ev = {'groups': ss.get('groups'), 'count': ss.get('count'), 'violations': fz.get('violations'), 'joint': fz.get('joint'), 'rule': fz.get('rule'), 'complete': ss.get('complete')}
    if bad_f:
        rec.item('Q06/S*/factorisation', 'FAIL', 'a unit behaves differently in a scenario of S* without depending on a conflict the scenario varies, or a joint scenario differs from the product of its groups: %s' % json.dumps(bad_f)[:300], g_ev, check='Q06.S*', sub_requirements=rows)
    elif not ss.get('complete'):
        rec.item('Q06/S*/factorisation', 'NOT-RUN', 'the scenario set of this run is %s (%d scenarios), not S*' % (ss.get('id'), ss.get('count', 0)), g_ev, check='Q06.S*', sub_requirements=rows)
    else:
        rec.item('Q06/S*/factorisation', 'PASS', 'S* has %d scenarios in %d interaction groups; every scenario changes only the units that depend on a conflict it varies and the joint scenarios equal the product of the groups' % (ss['count'], len(ss['groups'])), g_ev, check='Q06.S*', sub_requirements=rows)
    und = K.get('undrawn') or {}
    chk = und.get('checker')
    rec.extra['undrawn_research'] = {'files': und.get('files'), 'checker': chk, 'note': 'inputs of the layer\'s build, never an item\'s result (U-28); a record the layer has not consumed gives a unit no path'}
    n_leaf = {'moving': 0, 'edge_only': 0, 'not_drawn': 0, 'not_on_field': 0, 'aggregate': 0}
    for u in units:
        uid = u['id']
        sub = sub_requirements_for(rows, all_ids, uid, populations=('R17',))
        if u['render'] == 'aggregate':
            n_leaf['aggregate'] += 1
            continue
        vs = labels(D, u)
        recs = [(((D['behaviours'].get(uid) or {}).get(h)), h, sids, lab) for h, sids, lab in vs]
        first = recs[0][0] if recs and recs[0][0] else None
        if u['render'] == 'not_on_field' or u['status'] in NOF:
            n_leaf['not_on_field'] += 1
            rec.item('Q06/Q06.3/%s' % uid, 'N/A', 'unit %s is listed as %s: it was not on the field, so no march to a fighting position is expected (gating rule 2)' % (uid, u['status']), {'status': u['status'], 'render': u['render']}, check='Q06.3', subjects=[uid], sub_requirements=sub)
            continue
        if u['render'] in ('edge_only', 'not_drawn'):
            n_leaf[u['render']] += 1
            f = recs[0][0] if recs and recs[0][0] else None
            if f is None:
                rec.item('Q06/Q06.3/%s' % uid, 'BLOCKED-INPUT', 'input missing: the node scan holds no record of this unit', {}, check='Q06.3', subjects=[uid], sub_requirements=sub)
                continue
            st = (und.get('status') or {}).get(uid) or {}
            by = (und.get('by_unit') or {}).get(uid) or {}
            ev = {'render': f['render'], 'reason': f['render_reason'], 'plan': f.get('plan'), 'approach': f.get('approach'), 'entry': f.get('entry'), 'register': f.get('register'),
                  'research': {'status_json_reason': st.get('reason'), 'claims_own': st.get('claims_own'), 'group_file_records_by_kind': by, 'checker': (chk or {}).get('files') if chk else None, 'checker_exit': (chk or {}).get('exit') if chk else None,
                               'layer_consumes_them': False, 'note': 'the group files are inputs of the build; the layer built here has not consumed them, so they give this unit no path (GATE-SPEC Q06 state)'}}
            if f['render'] == 'edge_only':
                why = 'the layer shows unit %s only where its road of approach leaves the loaded ground (%s): it has no path to a fighting position inside the ground (%s)' % (uid, (f.get('plan') or {}).get('road'), (f.get('plan') or {}).get('reason'))
            else:
                why = 'the layer does not draw unit %s: it has no path at all (%s)' % (uid, f['render_reason'][:240])
            rec.item('Q06/Q06.3/%s' % uid, 'FAIL', why + '. A path can always be inferred: "too many units" is never a reason (Law cl. 1, X-20); the unit is an item with no path, LINKED-ACTIVE at sub-requirement level only with an L3 register entry', ev, check='Q06.3', subjects=[uid], sub_requirements=sub)
            continue
        # ---- a unit the layer draws: one item per behaviour for Q06.1, Q06.2, Q06.5, and Q06.4 where it leaves
        n_leaf['moving'] += 1
        cav = u['arm'] == 'cavalry'
        upper = ((doc['cavalry']['upper'] if cav else doc['foot']['upper']) * FACTOR) if doc else None
        for R, h, sids, lab in recs:
            base = {'scenarios': sids[:12], 'n_scenarios': len(sids), 'hash': h}
            if R is None:
                for chk_ in ('Q06.1', 'Q06.2', 'Q06.5'):
                    rec.item('Q06/%s/%s/%s' % (chk_, uid, lab), 'BLOCKED-INPUT', 'input missing: the node scan holds no record of this unit under behaviour %s' % h, base, check=chk_, subjects=[uid], scenario=lab, sub_requirements=sub)
                continue
            legs, joins, entry, ap, plan = R['legs'], R['joins'], R.get('entry'), R.get('approach'), R.get('plan') or {}
            f1 = []
            if not legs:
                f1.append('the unit is drawn but has no leg at all')
            for j in joins:
                if j['d_m'] is not None and j['d_m'] > JOIN_M:
                    f1.append('leg %d starts %.2f m from where %s ended (T-Q05-1: %s m)' % (j['i'], j['d_m'], 'the leg before' if j['after'] == 'leg' else 'the entry', JOIN_M))
                if j['gap_s'] is not None and j['gap_s'] < -1e-3:
                    f1.append('leg %d starts %.1f s before %s ended: the unit is in two places' % (j['i'], -j['gap_s'], 'the leg before' if j['after'] == 'leg' else 'its entry'))
            lv0 = R.get('leave')
            dep_t1 = ((lv0 or {}).get('march_before') or {}).get('t1')
            chain = [l for l in legs if not (dep_t1 is not None and abs(l['t1'] - dep_t1) < 1e-9)] or legs              # the march out after the fighting position is the departure (Q06.4), not part of the chain to it
            slot = R.get('slot')
            if chain and slot is not None:
                d_end = ((chain[-1]['end'][0] - slot['x']) ** 2 + (chain[-1]['end'][1] - slot['z']) ** 2) ** 0.5
                if d_end > JOIN_M:
                    f1.append('the last leg of the chain (before any departure) ends %.2f m from the unit\'s own fighting position (layer.slotOf)' % d_end)
            if legs and slot is None:
                f1.append('the layer gives the unit no fighting position (slotOf is null) although it has legs')
            for l in legs:
                if TIER_RANK.get(l.get('tier'), -1) < 1:
                    f1.append('leg %d has tier %r: a leg of a march is documented, inferred or plausible-procedural, never an open gap or unmarked' % (l['i'], l.get('tier')))
                if not l.get('sources'):
                    f1.append('leg %d carries no source key' % l['i'])
                if l.get('mean_ms') is None or l['mean_ms'] <= 0:
                    f1.append('leg %d has no rate (mean speed %r)' % (l['i'], l.get('mean_ms')))
                elif upper is not None and (l.get('max_seg_ms') or 0) > upper:
                    f1.append('leg %d is walked at %.4f m/s, above the documented bound %.4f m/s (Q05)' % (l['i'], l['max_seg_ms'], upper))
            if ap is None:
                f1.append('the unit has no road of approach card (route, tier, sources)')
            elif TIER_RANK.get(ap.get('tier'), -1) < 1:
                f1.append('the road of approach %s has tier %r' % (ap.get('id'), ap.get('tier')))
            elif not (ap.get('has_sources') or ap.get('modelled')):
                f1.append('the road of approach %s names no ledger cell, claim or sibling it is read from' % ap.get('id'))
            if (plan.get('n_stops', 0) + plan.get('n_days_feasible', 0)) < 1 and legs:
                f1.append('no stop and no day position stands behind the legs: the fighting position is not documented or inferred from any clause')
            conds1 = [cond('there is a chain of legs from the entry to the fighting position, joined within 1 m and in time order, ending at the unit\'s fighting position', not [x for x in f1 if 'leg' in x or 'chain' in x or 'fighting' in x or 'two places' in x], '; '.join([x for x in f1 if 'leg' in x or 'fighting' in x or 'two places' in x][:3])),
                      cond('every leg carries a tier and sources and a rate inside the documented bound', not [x for x in f1 if 'tier' in x or 'source key' in x or 'rate' in x or 'bound' in x], '; '.join([x for x in f1 if 'tier' in x or 'source key' in x or 'rate' in x or 'bound' in x][:3])),
                      cond('the route is a documented or inferred road of approach with its tier, and a clause stands behind the fighting position', not [x for x in f1 if 'road of approach' in x or 'stop' in x], '; '.join([x for x in f1 if 'road of approach' in x or 'stop' in x][:3]))]
            bad1 = first_failed(conds1)
            ev1 = dict(base, conditions=conds1, n_legs=len(legs), legs=[{k: l[k] for k in ('i', 't0', 't1', 'length_m', 'mean_ms', 'gait', 'tier', 'sources')} for l in legs][:24], joins=joins[:24], approach=ap, plan=plan, stops=R.get('stops'), days=R.get('days'), slot=R.get('slot'), chain_legs=len(chain), departure_leg=dep_t1 is not None, documented_upper_ms=upper)
            rec.item('Q06/Q06.1/%s/%s' % (uid, lab), 'FAIL' if bad1 else 'PASS', ('unit %s under %s: ' % (uid, lab) + '; '.join(bad1)) if bad1 else 'unit %s under %s: a chain of %d leg(s) from the entry at the edge to the fighting position, each with tier and sources, joined within 1 m' % (uid, lab, len(legs)), ev1, check='Q06.1', subjects=[uid], scenario=lab, sub_requirements=sub)
            # ---- Q06.2
            f2, reg_needed = [], False
            lay = R.get('layout') or {}
            if lay.get('kind') not in ('col', 'cav'):
                f2.append('the unit is built in layout %r: it appears deployed, not in a column of march' % lay.get('kind'))
            ft0 = entry['t'] if entry else None
            for fe in R.get('formations') or []:
                reg_needed = True
                if ft0 is not None and fe['t'] < ft0 - 1e-9:
                    f2.append('a change of formation to %s at minute %s precedes the entry (%s)' % (fe['formation'], fe['t'], ft0))
                elif not any(l['t1'] <= fe['t'] + 1e-6 for l in legs):
                    f2.append('a change of formation to %s at minute %s comes before the unit has marched anywhere' % (fe['formation'], fe['t']))
                if fe.get('duration_s') != DEPLOY_S:
                    f2.append('the change at minute %s lasts %s s, not the recorded %s s tuning value (T-Q06-1)' % (fe['t'], fe.get('duration_s'), DEPLOY_S))
                if TIER_RANK.get(fe.get('tier'), -1) > TIER_RANK['plausible-procedural']:
                    f2.append('the change at minute %s shows tier %s, but its duration (%s s) is a tuning value, plausible-procedural: the weakest tier of its parts must be shown' % (fe['t'], fe.get('tier'), fe.get('duration_s')))
            ok_reg, reg_reasons, reg_states = covered_by_register(env, Q06_2_ENTRIES) if reg_needed else (True, [], [])
            ev2 = dict(base, layout=lay, formations=R.get('formations'), formation_default_s=R.get('formation_default_s'), register_ids=Q06_2_ENTRIES, register_reasons=reg_reasons)
            iid2 = 'Q06/Q06.2/%s/%s' % (uid, lab)
            if f2:
                rec.item(iid2, 'FAIL', 'unit %s under %s: %s' % (uid, lab, '; '.join(f2[:3])), ev2, check='Q06.2', subjects=[uid], scenario=lab, sub_requirements=sub)
            elif reg_needed and not ok_reg:
                rec.item(iid2, 'BLOCKED-INPUT', 'input missing: an open register entry that holds the deployment duration of %s s (plausible-procedural, no drill-manual figure: T-Q06-1, A-38) for the %d change(s) of formation of unit %s; %s' % (DEPLOY_S, len(R.get('formations') or []), uid, '; '.join(reg_reasons) or 'no register entry names this gap'), ev2, check='Q06.2', subjects=[uid], scenario=lab, sub_requirements=sub)
            else:
                rec.item(iid2, 'PASS', 'unit %s under %s: built in a column of march%s' % (uid, lab, (' and deploys %d time(s) after it has marched to its place, the duration marked plausible-procedural and registered' % len(R['formations'])) if R.get('formations') else '; it has no change of formation'), ev2, check='Q06.2', subjects=[uid], scenario=lab, sub_requirements=sub)
            # ---- Q06.5
            f5 = []
            if entry is None:
                f5.append('no enter event')
            else:
                if not entry.get('outside_box') or not entry.get('outside_ground'):
                    f5.append('the entry lies inside the loaded ground')
                if entry.get('d_road_m') is None:
                    f5.append('the unit has no road line to put the entry on')
                elif entry['d_road_m'] > JOIN_M:
                    f5.append('the entry is %.1f m from the road of approach' % entry['d_road_m'])
                if entry.get('crossing_s') is None:
                    f5.append('the road of approach does not cross the edge of the loaded ground')
                es = (R.get('arrival') or {}).get('entry_status') or ''
                if not es.startswith('resolved'):
                    f5.append('the arrival record does not resolve the entry (%s)' % es[:80])
            rec.item('Q06/Q06.5/%s/%s' % (uid, lab), 'FAIL' if f5 else 'PASS', ('unit %s under %s: ' % (uid, lab) + '; '.join(f5)) if f5 else 'unit %s under %s: enters at the edge of the loaded ground on %s, at the place and time the arrival record gives' % (uid, lab, (plan or {}).get('road')),
                     dict(base, entry=entry, arrival=R.get('arrival')), check='Q06.5', subjects=[uid], scenario=lab, sub_requirements=sub)
            # ---- Q06.4
            lv = R.get('leave')
            if lv:
                f4 = []
                mb = lv.get('march_before')
                if mb is None:
                    f4.append('leaves at minute %s with no march before it: the unit vanishes where it stands' % lv['t'])
                else:
                    if mb.get('end_in_box'):
                        f4.append('the march before the leave ends inside the loaded ground')
                    if lv['t'] < mb['t1'] - 1e-9:
                        f4.append('leaves at minute %s before the march out ends (%s)' % (lv['t'], mb['t1']))
                    dep = [j for j, l in zip(joins, legs) if abs(l['t1'] - mb['t1']) < 1e-9]
                    if dep and dep[0]['d_m'] is not None and dep[0]['d_m'] > JOIN_M:
                        f4.append('the march out starts %.2f m from where the unit last stood' % dep[0]['d_m'])
                rec.item('Q06/Q06.4/%s/%s' % (uid, lab), 'FAIL' if f4 else 'PASS', ('unit %s under %s: ' % (uid, lab) + '; '.join(f4)) if f4 else 'unit %s under %s: leaves by a march that starts where it stood and ends outside the loaded ground' % (uid, lab), dict(base, leave=lv), check='Q06.4', subjects=[uid], scenario=lab, sub_requirements=sub)
    rec.extra['leaf_units_by_render'] = n_leaf
    rec.owe('Q06.3: a path for every leaf unit the layer does not draw (history/undrawn: the four group files hold the research; they are merged into the layer build by their owner) and for the units it shows only at the edge of the ground; each is FAIL here and LINKED-ACTIVE at sub-requirement level only with an L3 register entry')
    rec.owe('Q06.2: an open register entry that holds the deployment duration of 90 s (DEC-008 is a decision of the builder, not a register entry) and the product marking that its tier is plausible-procedural; a drill-manual figure, when one is read, replaces the 90 s (T-Q06-1)')
    rec.note('Q06 has no COVERED branch (the gate text itself allows "documented or inferred"); the aggregate units (formations above the regiments) carry no figure and no item: their leaf units carry the chains')


def run(env, dump=None, inputs=None, write=True, mutate=None, argv=None, extra=(), check_undrawn=True):
    rec = Record(GATE, env, renderer_class='node', argv=argv)
    rec.tool_versions['node'] = node_version()
    D = dump if dump is not None else layer_dump(env, 'q06_path.mjs', list(extra), mutate=mutate, timeout=6 * 3600)
    K = inputs if inputs is not None else load_inputs(rec, env, run_checker=check_undrawn)
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
    ap.add_argument('--units', default=None, help='comma list of unit ids (a partial scan: INCOMPLETE)')
    ap.add_argument('--no-undrawn-check', action='store_true', help='do not run check_undrawn.py --all (evidence only)')
    a = ap.parse_args(argv)
    env = Env(root=a.root, out=a.out)
    dump = None
    if a.dump:
        with open(a.dump, encoding='utf-8') as f:
            dump = json.load(f)
    extra = ['--scenarios', a.scenarios] + (['--units', a.units] if a.units else [])
    rec, out = run(env, dump=dump, write=not a.no_write, mutate=a.mutate, argv=['python3', 'tools/bt/gates/q06_path.py'] + list(argv if argv is not None else sys.argv[1:]), extra=extra, check_undrawn=not a.no_undrawn_check)
    if not a.quiet:
        c = out['counts']
        print('Q06 verdict %s: %d items, PASS %d, COVERED %d, FAIL %d, NOT-RUN %d, BLOCKED-INPUT %d, N/A %d' % (out['verdict'], out['totals']['items'], c['PASS'], c['COVERED'], c['FAIL'], c['NOT-RUN'], c['BLOCKED-INPUT'], c['N/A']))
    return {'PASS': 0, 'FAIL': 1, 'INCOMPLETE': 2}[out['verdict']]


if __name__ == '__main__':
    guarded_main(main)
