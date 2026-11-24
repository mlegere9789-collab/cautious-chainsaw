#!/usr/bin/env python3
"""Gate Q20: "Cavalry presence: every documented cavalry unit appears at its documented times with its manifest, horses and arms." (plan p. 136, Q). GATE-SPEC.md 2, Q20.1 to Q20.6.

    python3 tools/bt/gates/q20_cavalry.py [--out DIR] [--mutate FILE.mjs] [--no-gait-test] [--no-write] [--quiet]

Writes `<out>/Q20.json` (default GOVERNANCE/gate_results), record `bt-gate-result/1`. Exit code 0 PASS, 1 FAIL, 2 INCOMPLETE, 3 runner error. It sets no `passes` flag.

It reads the kit cavalry cards (`kit/cavalry_units.json`), the cavalry horse data (`app/data/cavalry-horses.json`), the plan's own list of cavalry states (BIBLE/plan-clean.txt, B.6.15.7), the verified order of
battle (`kit/verified_oob.json`, the table of Q01) and what the REAL product holds, dumped by the node child q20_layer.mjs: every cavalry and horse-artillery unit of the layer, its arrival, the kit card the
figure pass resolves it to, the horses and roles of `src/history/cavalry.mjs`, the mounted instances of the world and, from the real per-figure manifests of the page, every field, rank, instrument and arm of
every figure. The gait-cycle foot-contact test (plan D.2 V9) is the application's own `tests/anim3d-gaits.test.mjs`, run as a child.

  Q20.1 the set      every cavalry unit of the layer has its kit card and every card has its unit; the verified OOB and the layer agree on which units are cavalry (BLOCKED-INPUT without the table)
  Q20.2 times        a documented unit that is never drawn fails; a drawn unit is compared with the B.6.15.3 action table as a machine table (none exists: BLOCKED-INPUT)
  Q20.3 manifest     a drawn unit has a manifest for every figure and every soldier type present (trooper, officer, trumpeter, horse holder) with the cavalry equipment of K.8
  Q20.4 horses       one horse for every drawn trooper (a flagged plausible-procedural figure, passing only with its gap registered at L3), one in four holds four horses, colour, type, condition, casualties
  Q20.5 arms         carbine, revolver and sabre per regiment from the sources; Spencers only in the 5th Michigan (all) and part of the 6th on July 3, never on Buford's line on July 1; no Henry
  Q20.6 states       the cavalry states of B.6.15.7 are time-keyed per unit, the dismounted fights show horse holders, the gait-cycle foot-contact test passes

Q20 has no COVERED branch: a gap passes only as a flagged value whose register entry is open, complete and has a dated search log (GATE-SPEC 1.4, L3 b); no register entry of the horse gaps is at that level today.
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

from oobgates_common import cond, covered_by_register, first_failed, gate_rows, layer_dump, runner_version, sub_requirements_for  # noqa: E402
from pq_common import Env, InputMissing, Record, base_parser, guarded_main, node_version  # noqa: E402

GATE = 'Q20'
TABLE_REL = 'kit/verified_oob.json'
ACTION_REL = 'kit/cavalry_action_table.json'
OFF_FIELD = ('never_on_field', 'never_main_field', 'documented_absent')
MISSING_TABLE = 'input missing: docs/battle-theatre/kit/verified_oob.json (the verified order-of-battle table of GATE-SPEC Q01.1: it decides which cavalry units are documented)'
MISSING_ACTIONS = 'input missing: the B.6.15.3 action table of the cavalry (June 26 to July 16) as a machine table (docs/battle-theatre/kit/cavalry_action_table.json): kit/cavalry_units.json holds an `action_table_note` only, so the documented intervals of presence of each unit cannot be compared'
GAPS = {'horses': ['EG-CAV-01'], 'casualties': ['EG-CAV-02'], 'holders': ['EG-CAV-03'], 'shares': ['EG-CAV-04'], 'colour': ['EG-FIG-0007'], 'spare': ['EG-CAV-05'], 'arms': ['EG-0196', 'EG-0268'], 'undrawn': ['EG-CAV-07']}
SPENCER_UNITS = ('US.CAV.5MICH', 'US.CAV.6MICH')


def state_names(plan):
    """The cavalry states the plan prints in B.6.15.7: the first column of the table between its heading and the arrival-rule paragraph (the state names are the lower-case lines)."""
    if not plan:
        return None
    lines = plan.split('\n')
    try:
        a = next(i for i, ln in enumerate(lines) if ln.startswith('B.6.15.7 Cavalry state and behaviour list'))
    except StopIteration:
        return None
    out = []
    for ln in lines[a + 1:]:
        if ln.startswith('Fixed facts for the arrival rule'):
            break
        ln = ln.strip()
        if re.match(r'^[a-z][a-z0-9_ /()\-]*$', ln):
            out.append(ln)
    return out


def load_inputs(rec, env, table_path=None):
    K = {}
    for key, rel, role in (('kit', 'kit/cavalry_units.json', 'data'), ('horses', 'app/data/cavalry-horses.json', 'data'), ('weapons', 'kit/weapons.json', 'data')):
        try:
            K[key] = rec.read_json(env.btp(rel), role)
        except InputMissing as e:
            K[key] = None
            K.setdefault('missing', []).append(str(e))
    for key, path in (('table', table_path or env.btp(TABLE_REL)), ('actions', env.btp(ACTION_REL))):
        try:
            K[key] = rec.read_json(path, 'table')
        except InputMissing:
            K[key] = None
    try:
        K['plan'] = rec.read_text(env.btp('BIBLE/plan-clean.txt'), 'text')
    except InputMissing:
        K['plan'] = None
    for rel in ('app/src/history/cavalry.mjs', 'app/src/history/figures.mjs', 'app/src/history/kit.mjs', 'app/src/world-from-units.mjs', 'app/tests/anim3d-gaits.test.mjs', 'app/src/anim3d/clips-cavalry.mjs', 'app/src/anim3d/gaits.mjs'):
        rec.add_input(env.btp(rel), 'code')
    for fn in ('q20_cavalry.py', 'q20_layer.mjs', 'oob_layer_lib.mjs', 'oobgates_common.py'):
        rec.add_input(os.path.join(HERE, fn), 'runner')
    return K


def gait_test(env):
    """Run the application's own gait test (D.2 V9: hoof stance moves at the gait speed, beat orders, rider and horse in phase) with node's runner and read its summary; a skipped or cancelled test is not a pass."""
    fn = os.path.join(env.bt, 'app', 'tests', 'anim3d-gaits.test.mjs')
    if not os.path.isfile(fn):
        return {'status': 'no_test', 'reason': 'app/tests/anim3d-gaits.test.mjs does not exist'}
    e = dict(os.environ)
    for k in ('NODE_USE_ENV_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy'):
        e.pop(k, None)
    p = subprocess.run(['node', '--test', fn], capture_output=True, text=True, cwd=env.root, env=e, encoding='utf-8', timeout=900)
    txt = p.stdout
    g = lambda k: int((re.search(r'^# %s (\d+)' % k, txt, re.M) or [0, -1])[1])  # noqa: E731
    return {'status': 'ran', 'exit': p.returncode, 'tests': g('tests'), 'pass': g('pass'), 'fail': g('fail'), 'cancelled': g('cancelled'), 'skipped': g('skipped'), 'todo': g('todo'), 'not_run_marker': 'NOT RUN' in txt}


ACTION_SCHEMA = 'bt-cavalry-action-table/1'
ACTION_ROW_KEYS = ('id', 'page', 'kind', 'compare', 'start_earliest', 'start_latest', 'units')


def action_table_problems(T):
    """None when the machine table of B.6.15.3 is readable (schema, rows, every row with its id, page citation, kind, compare flag, window and unit list), else a one-line reason."""
    if not isinstance(T, dict) or T.get('schema') != ACTION_SCHEMA or not isinstance(T.get('rows'), list):
        return 'the action table is not in the layout this runner reads (schema %r, expected %r with a list of rows)' % ((T or {}).get('schema') if isinstance(T, dict) else None, ACTION_SCHEMA)
    for r in T['rows']:
        miss = [k for k in ACTION_ROW_KEYS if k not in r or (k in ('id', 'page', 'kind', 'units') and r[k] in (None, '', []) and not (k == 'units' and isinstance(r.get(k), list)))]
        if miss:
            return 'row %s of the action table lacks %s (every row keeps its page citation)' % (r.get('id'), ', '.join(miss))
    return None


def row_names_unit(r, uid):
    return any(uid == p or uid.startswith(p + '-') for p in r.get('units') or [])


def action_presence(T, u):
    """Q20.2 against the machine table of B.6.15.3. A drawn on-field unit is compared with the rows that name it and that the table marks `compare` (the plan puts them at Gettysburg or its field):
    (1) it must be on the field (arrival default) no later than the latest start the table allows for its first documented action; (2) for a row of kind `arrival` it must not enter before the earliest
    documented time. A unit no comparing row names is NOT-RUN, never PASS: a presence that cannot be compared is not shown."""
    bad = action_table_problems(T)
    if bad:
        return ('BLOCKED-INPUT' if (isinstance(T, dict) and T.get('schema') == ACTION_SCHEMA) else 'NOT-RUN'), bad, {'missing': ACTION_REL}
    uid = u['id']
    named = [r for r in T['rows'] if row_names_unit(r, uid)]
    rows = sorted([r for r in named if r.get('compare')], key=lambda r: (r['start_earliest'] if r.get('start_earliest') is not None else r['start_latest'], r['id']))
    ev = {'rows_naming_the_unit': [r['id'] for r in named], 'rows_compared': [r['id'] for r in rows], 'pages': sorted({pg for r in rows for pg in (r.get('pages') or [r['page']])})}
    if not rows:
        return 'NOT-RUN', 'no row of the B.6.15.3 table that the table marks as at the field names this unit (named in %d other row(s)): its presence interval cannot be compared' % len(named), ev
    arr = u.get('arrival') or {}
    first = rows[0]
    conds = [cond('the unit is on the field (arrival default %s) no later than the latest start the table allows for its first documented action (%s, p. %s: %s)' % (arr.get('default'), first['id'], first['page'], first.get('date_text')),
                  arr.get('default') is not None and arr['default'] <= first['start_latest'], 'arrival default %s, latest start %s: the unit is not on the field when the documented action begins' % (arr.get('default'), first['start_latest']))]
    for r in rows:
        if r.get('kind') == 'arrival' and r.get('start_earliest') is not None:
            conds.append(cond('the unit does not enter before its documented arrival (%s, p. %s)' % (r['id'], r['page']), arr.get('earliest') is not None and arr['earliest'] >= r['start_earliest'],
                              'arrival earliest %s is before its documented arrival %s' % (arr.get('earliest'), r['start_earliest'])))
    bad_c = first_failed(conds)
    ev['conditions'] = conds
    if bad_c:
        return 'FAIL', 'presence: ' + '; '.join(bad_c), ev
    return 'PASS', 'the unit is on the field when its first documented action begins and enters no earlier than a documented arrival (%s)' % ', '.join(r['id'] for r in rows), ev


def sw(items, pat):
    return [k for k in (items or {}) if re.search(pat, k, re.I)]


def evaluate(rec, env, D, K, gait=None, gap_cover=None):
    rows, all_ids = gate_rows(env, GATE)
    kit = K.get('kit') or {}
    cards = kit.get('cards') or {}
    kunits = kit.get('units') or {}
    T = K.get('table')
    gap_cover = gap_cover or (lambda ids: covered_by_register(env, ids))
    mk = lambda check, subj, scen, res, reason, ev, unit=None: rec.item('Q20/%s/%s/%s' % (check, subj, scen), res, reason, ev, check=check, scenario=scen, subjects=[unit or subj],  # noqa: E731
                                                                         sub_requirements=sub_requirements_for(rows, all_ids, unit or subj))
    by = {u['id']: u for u in D['units']}
    seen_cards = set()
    for u in sorted(D['units'], key=lambda x: x['id']):
        uid = u['id']
        off = u['status'] in OFF_FIELD
        kitid = (u.get('kit') or {}).get('unit')
        has_card = bool(kitid) and kitid in cards and not (u.get('kit') or {}).get('default')
        if has_card:
            seen_cards.add(kitid)
        horse_art = u['arm'] == 'artillery'
        # ---- Q20.1
        ok_card = (off and not u['drawn']) or has_card or horse_art
        c = [cond('the unit is documented off the field and is never drawn (with its record), or it has a cavalry kit card', ok_card,
                  None if ok_card else 'no kit card: the figure pass resolves it to %s (%s)' % (kitid, (u.get('kit') or {}).get('how')))]
        if T is not None:
            tu = (T.get('units') or {}).get(uid)
            c.append(cond('the verified OOB holds the unit as cavalry', tu is not None and ((tu.get('arm') == 'cavalry') or horse_art), 'not in the table' if tu is None else 'table branch %r' % tu.get('arm')))
        bad = first_failed(c)
        ev = {'conditions': c, 'kit': u.get('kit'), 'status': u['status'], 'drawn': u['drawn']}
        if bad:
            mk('Q20.1', uid, 'default', 'FAIL', 'cavalry set: ' + '; '.join(bad), dict(ev, layer_only_result='FAIL'))
        elif T is None:
            mk('Q20.1', uid, 'default', 'BLOCKED-INPUT', MISSING_TABLE + ' (layer-only finding: the unit has its kit card)', dict(ev, layer_only_result='PASS', missing=TABLE_REL))
        else:
            mk('Q20.1', uid, 'default', 'PASS', 'the unit has its card and the verified OOB holds it as cavalry', ev)
        # ---- Q20.2
        if off:
            mk('Q20.2', uid, 'default', 'PASS' if not u['drawn'] else 'FAIL', 'documented off the field (%s): never drawn' % u['status'] if not u['drawn'] else 'documented off the field and drawn', {'status': u['status'], 'drawn': u['drawn']})
        elif not u['drawn']:
            mk('Q20.2', uid, 'default', 'FAIL', 'a documented cavalry unit (status %s) is never present in the product: not drawn (%s)' % (u['status'], u['render_reason'][:140]), {'status': u['status'], 'render': u['render'], 'arrival': u.get('arrival'), 'register': GAPS['undrawn']})
        elif K.get('actions') is None:
            mk('Q20.2', uid, 'default', 'BLOCKED-INPUT', MISSING_ACTIONS, {'missing': ACTION_REL, 'arrival': u.get('arrival'), 'render': u['render']})
        else:
            res, why, ev2 = action_presence(K['actions'], u)
            mk('Q20.2', uid, 'default', res, why, dict(ev2, arrival=u.get('arrival'), render=u['render']))
        # ---- Q20.3 manifest and Q20.4 horses
        if off:
            mk('Q20.3', uid, 'default', 'N/A', 'documented off the field: no figure, no manifest', {'status': u['status']})
            mk('Q20.4', uid, 'default', 'N/A', 'documented off the field: no horses', {'status': u['status']})
            continue
        if not u['drawn']:
            mk('Q20.3', uid, 'default', 'FAIL', 'the unit is documented on the field and has no figures: no manifest', {'render': u['render']})
            mk('Q20.4', uid, 'default', 'FAIL', 'the unit is documented on the field and has no riders, no horses', {'render': u['render']})
            continue
        f, s = u.get('figures') or {}, u.get('summary') or {}
        bf = s.get('by_field') or {}
        n = u['strength_drawn']
        full = ['headgear', 'coat', 'trousers', 'shoes', 'accoutrements', 'weapon', 'sidearm_sword']
        short = [k for k in full if sum(x['count'] for x in bf.get(k, [])) != n]
        acc_items = {i for x in bf.get('accoutrements', []) for i in x['items']}
        c3 = [cond('a manifest exists for every one of the %d figures' % n, f.get('with_manifest') == n and bool(s), 'with manifest %s of %s' % (f.get('with_manifest'), n)),
              cond('every figure has an item in each of the fields headgear, coat, trousers, shoes, accoutrements, weapon, sidearm', not short, 'fields that do not cover every figure: %s' % short),
              cond('horse furniture: a saddle and a bridle among the accoutrements', any(re.search('saddle', i) for i in acc_items) and any(re.search('bridle', i) for i in acc_items), 'accoutrements %s' % sorted(acc_items)),
              cond('a carbine, a sabre and a revolver among the arms', bool(sw(f.get('weapon_items'), 'carbine|rifle')) and bool(sw(f.get('sidearm_items'), 'sabre|saber|sword')) and bool(sw(f.get('sidearm_items'), 'colt|remington|lemat|revolver')),
                   'weapons %s, sidearms %s' % (sorted(f.get('weapon_items') or {}), sorted(f.get('sidearm_items') or {}))),
              cond('soldier types: a trooper, an officer and a trumpeter are among the figures', any(r == 'private' for r in (f.get('rank') or {})) and any(r != 'private' for r in (f.get('rank') or {})) and bool(sw(f.get('instrument'), 'bugle|trumpet')),
                   'ranks %s, instruments %s' % (f.get('rank'), f.get('instrument')))]
        d = u.get('dismount')
        if d and d.get('counts'):
            c3.append(cond('a horse holder is a figure of the unit (every fourth dismounted man)', (d.get('roles') or {}).get('hold') == d['counts']['holders'], 'roles %s, counts %s' % (d.get('roles'), d['counts'])))
        bad3 = first_failed(c3)
        ev3 = {'conditions': c3, 'figures': f, 'fields': {k: [(x['items'], x['count'], x['tier']) for x in v] for k, v in bf.items()}, 'date': s.get('date'), 'kit_unit': s.get('kit_unit')}
        if bad3:
            mk('Q20.3', uid, 'default', 'FAIL', 'manifest: ' + '; '.join(bad3), ev3)
        else:
            mk('Q20.3', uid, 'default', 'PASS', 'a manifest for every figure and every soldier type present, with the cavalry equipment of K.8', ev3)
        hz = u.get('horse') or {}
        ok_gap, why_gap, states = gap_cover(GAPS['horses'])
        c4 = [cond('one horse for every drawn trooper (the point of the horse range is the number of riders)', (hz.get('horses') or {}).get('point') == n and (u['world'] or {}).get('mounted') == n, 'range %s, riders %s, mounted in the world %s' % (hz.get('horses'), n, (u['world'] or {}).get('mounted'))),
              cond('the figure is a flagged plausible-procedural value (no regimental mounted strength is in the record)', hz.get('tier') == 'plausible-procedural' and bool(hz.get('gap')), 'tier %s, gap %s' % (hz.get('tier'), hz.get('gap'))),
              cond('its gap is a register entry that is open, complete and has a dated search log (a gap passes only as a flagged value, GATE-SPEC Q20)', ok_gap, '; '.join(why_gap))]
        if d and d.get('counts'):
            c4.append(cond('one trooper in four holds four horses when dismounted', d['counts']['holders'] == d['counts']['dismounted'] // D['cavalry_module']['holder']['group'], 'counts %s' % d['counts']))
        bad4 = first_failed(c4)
        ev4 = {'conditions': c4, 'horse': hz, 'dismount': d, 'register': states}
        if bad4:
            mk('Q20.4', uid, 'default', 'FAIL', 'horses: ' + '; '.join(bad4), ev4)
        else:
            mk('Q20.4', uid, 'default', 'PASS', 'one horse per drawn trooper, passing only against the flagged value whose register entry is complete', ev4)
    # ---- Q20.1 for kit cards with no unit in the layer
    # one item per id: a kit card id may be shared with a verified-OOB unit id (and a card by several units); every finding on the id is kept in the one item
    orphan = {}
    for kid in sorted(cards):
        if kid not in seen_cards:
            orphan.setdefault(kid, {})['card'] = ('kit card %s (%s) has no unit in the layer' % (kid, cards[kid].get('name')), {k: cards[kid].get(k) for k in ('name', 'army', 'parent', 'commander_printed')})
    if T is not None:
        have = set(D.get('all_unit_ids') or [u['id'] for u in D['units']])
        for tid, tu in sorted((T.get('units') or {}).items()):
            if tu.get('arm') == 'cavalry' and tu.get('level') in ('regiment', 'battalion', 'troop', 'battery', 'company') and tid not in have:
                orphan.setdefault(tid, {})['table'] = ('cavalry unit %s of the verified OOB is missing from the layer' % tid, {k: tu.get(k) for k in ('name', 'level', 'parent', 'in_roster')})
    for oid in sorted(orphan):
        f_ = orphan[oid]
        if len(f_) == 1 and 'card' in f_:
            mk('Q20.1', oid, 'default', 'FAIL', f_['card'][0], {'card': f_['card'][1]}, unit=oid)
        elif len(f_) == 1:
            mk('Q20.1', oid, 'default', 'FAIL', f_['table'][0], {'table_row': f_['table'][1]}, unit=oid)
        else:
            mk('Q20.1', oid, 'default', 'FAIL', f_['card'][0] + '; ' + f_['table'][0], {'card': f_['card'][1], 'table_row': f_['table'][1], 'shared_id': oid}, unit=oid)
    if T is None:
        rec.item('Q20/Q20.1/verified-oob/default', 'BLOCKED-INPUT', MISSING_TABLE, {'missing': TABLE_REL}, check='Q20.1', scenario='default', subjects=['verified-oob'], sub_requirements=rows)
    # ---- Q20.5 arms, per kit card
    drawn_by_kit = {}
    for u in D['units']:
        if u['drawn'] and (u.get('kit') or {}).get('unit'):
            drawn_by_kit.setdefault(u['kit']['unit'], []).append(u)
    for kid in sorted(cards):
        ku = kunits.get(kid) or {}
        w = ((ku.get('fields') or {}).get('weapon')) or {}
        allowed = w.get('allowed') or []
        items = [a['item'] for a in allowed]
        spen = [a for a in allowed if re.search('spencer', a['item'], re.I)]
        henry = [a for a in allowed if re.search('henry', a['item'], re.I)]
        side = [a['item'] for a in (((ku.get('fields') or {}).get('sidearm_sword')) or {}).get('allowed') or []]
        henry += [a for a in (((ku.get('fields') or {}).get('sidearm_sword')) or {}).get('allowed') or [] if re.search('henry', a['item'], re.I)]
        conds = [cond('the regiment has an arms record from a source or flagged as such (weapon field with a tier and source keys or a flag)', bool(w) and w.get('tier') in ('documented', 'inferred', 'plausible-procedural') and (bool(w.get('source_keys')) or bool(w.get('flagged'))),
                      'weapon field %s' % ({k: w.get(k) for k in ('tier', 'flagged', 'source_keys')} if w else 'absent: the regiment inherits the army default')),
                 cond('Spencers only in the 5th Michigan (all) and the 6th Michigan (part), from July 3', (not spen) or (kid in SPENCER_UNITS and all(a.get('valid_from') == '1863-07-03' for a in spen)),
                      'spencer items %s in %s' % ([(a['item'], a.get('valid_from')) for a in spen], kid)),
                 cond('no Henry', not henry, 'henry items %s' % [a['item'] for a in henry])]
        for u in drawn_by_kit.get(kid, []):
            f = u.get('figures') or {}
            sp = sw(f.get('weapon_items'), 'spencer')
            conds.append(cond('the manifests of the drawn unit %s hold no Spencer unless it is a Michigan regiment on or after July 3' % u['id'], (not sp) or (kid in SPENCER_UNITS and (u.get('summary') or {}).get('date', '') >= '1863-07-03'), 'spencer %s on %s' % (sp, (u.get('summary') or {}).get('date'))))
            conds.append(cond('the manifests of the drawn unit %s hold no Henry' % u['id'], not sw(f.get('weapon_items'), 'henry') and not sw(f.get('sidearm_items'), 'henry'), None))
        bad = first_failed(conds)
        ev = {'conditions': conds, 'weapon_items': items, 'sidearm_items': side, 'drawn_units': [x['id'] for x in drawn_by_kit.get(kid, [])]}
        if bad:
            mk('Q20.5', kid, 'default', 'FAIL', 'arms: ' + '; '.join(bad), ev, unit=kid)
        else:
            mk('Q20.5', kid, 'default', 'PASS', 'arms assigned from a source or flagged, Spencers and Henrys as the plan allows', ev, unit=kid)
    # ---- Q20.4 class items: colour, type and condition per regiment; horse casualties. The kit and the layer hold no regimental datum for either: the product draws a flagged plausible-procedural value
    # (a tuning palette of coat colours; a horse down with each fallen trooper), which can pass only against a gap whose register entry is complete and has a dated search log.
    for key, what, gapkey in (('colour-type-condition', 'horse colour and type distributions and condition per regiment (the furniture is judged in Q20.3)', 'colour'), ('casualties', 'horse casualties of every regiment', 'casualties')):
        ok, why, states = gap_cover(GAPS[gapkey])
        ev = {'gap_entries': GAPS[gapkey], 'register': states, 'kit_horse_records': len((kit.get('horses') or [])), 'flagged_value': 'plausible-procedural, drawn by the product'}
        kw = dict(check='Q20.4', scenario='default', subjects=[key], sub_requirements=rows)
        if ok:
            rec.item('Q20/Q20.4/%s/default' % key, 'PASS', 'the product draws a flagged plausible-procedural value for %s; its gap %s is a complete open register entry with a dated search log' % (what, ', '.join(GAPS[gapkey])), ev, **kw)
        else:
            rec.item('Q20/Q20.4/%s/default' % key, 'FAIL', 'no regimental data for %s exists in the repository; the product draws a flagged value and its gap %s is not covered: %s' % (what, ', '.join(GAPS[gapkey]), '; '.join(why)), ev, **kw)
    # ---- Q20.6 states, dismounted fights, gait test
    names = state_names(K.get('plan'))
    kit_states = {re.sub(r'[^a-z]+', ' ', (s.get('state') or '').lower()).strip() for s in (kit.get('behaviour_states') or [])}
    acts = set((D.get('activities') or {}).keys())
    if names is None:
        rec.item('Q20/Q20.6/states/default', 'BLOCKED-INPUT', 'input missing: the state list of B.6.15.7 could not be read from BIBLE/plan-clean.txt', {}, check='Q20.6', scenario='default', subjects=['states'], sub_requirements=rows)
    else:
        norm = lambda s: re.sub(r'[^a-z]+', ' ', s.lower()).strip()  # noqa: E731
        miss_kit = [n_ for n_ in names if norm(n_) not in kit_states]
        mp = (D.get('state_schedule') or {}).get('mapping')
        no_act = [n_ for n_ in names if not mp or not mp.get(n_) or not all(a in acts for a in mp[n_])]
        c6 = [cond('every state of B.6.15.7 is in the kit list', not miss_kit, 'not in the kit: %s' % miss_kit),
              cond('every state is mapped to activities of the product that the layer can time-key per unit (contract ACTIVITIES)', not no_act, ('no mapping from the plan\'s states to the product\'s activities exists' if not mp else 'states with no activity of the product: %s' % no_act)),
              cond('each cavalry unit holds a time-keyed schedule of these states (a machine schedule per unit)', bool((D.get('state_schedule') or {}).get('per_unit')), (D.get('state_schedule') or {}).get('basis') or 'the dump says nothing of a schedule of the %d states' % len(names))]
        bad6 = first_failed(c6)
        ev6 = {'conditions': c6, 'plan_states': names, 'plan_states_count': len(names), 'activities': sorted(acts), 'note': 'the plan text of Q20 says 14 states; the table of B.6.15.7 prints %d and all are required (stricter reading)' % len(names)}
        if bad6:
            rec.item('Q20/Q20.6/states/default', 'FAIL', 'cavalry states: ' + '; '.join(bad6), ev6, check='Q20.6', scenario='default', subjects=['states'], sub_requirements=rows)
        else:
            rec.item('Q20/Q20.6/states/default', 'PASS', 'all %d states of B.6.15.7 are in the kit, mapped to activities of the product, and time-keyed per unit' % len(names), ev6, check='Q20.6', scenario='default', subjects=['states'], sub_requirements=rows)
    if gait is None:
        rec.item('Q20/Q20.6/gait-foot-contact/default', 'NOT-RUN', 'the gait-cycle foot-contact test (app/tests/anim3d-gaits.test.mjs) was not run in this record (--no-gait-test)', {}, check='Q20.6', scenario='default', subjects=['gait-foot-contact'], sub_requirements=rows)
    elif gait.get('status') != 'ran':
        rec.item('Q20/Q20.6/gait-foot-contact/default', 'BLOCKED-INPUT', 'input missing: %s' % gait.get('reason'), gait, check='Q20.6', scenario='default', subjects=['gait-foot-contact'], sub_requirements=rows)
    elif gait.get('skipped') or gait.get('cancelled') or gait.get('not_run_marker') or gait.get('tests', 0) <= 0:
        rec.item('Q20/Q20.6/gait-foot-contact/default', 'NOT-RUN', 'the gait test skipped or cancelled part of itself (%s skipped, %s cancelled): a skipped test is not a pass (U-27)' % (gait.get('skipped'), gait.get('cancelled')), gait, check='Q20.6', scenario='default', subjects=['gait-foot-contact'], sub_requirements=rows)
    elif gait.get('exit') != 0 or gait.get('fail'):
        rec.item('Q20/Q20.6/gait-foot-contact/default', 'FAIL', 'the gait test fails: %s of %s tests failed (exit %s)' % (gait.get('fail'), gait.get('tests'), gait.get('exit')), gait, check='Q20.6', scenario='default', subjects=['gait-foot-contact'], sub_requirements=rows)
    else:
        rec.item('Q20/Q20.6/gait-foot-contact/default', 'PASS', 'the application\'s gait test passes (%d of %d tests, none skipped); the gaits it checks are modern equestrian ranges (G-ANIM-07), a structure test and not a documented speed' % (gait['pass'], gait['tests']), gait, check='Q20.6', scenario='default', subjects=['gait-foot-contact'], sub_requirements=rows)
    # dismounted fights: one item per record of the module
    for dr in D['cavalry_module']['dismounts']:
        us = [by[x] for p in dr['units'] for x in by if x == p or x.startswith(p + '-')]
        conds = [cond('every unit of the record is drawn (a dismounted fight is shown only for units on the screen)', bool(us) and all(x['drawn'] for x in us), 'units %s, drawn %s' % ([x['id'] for x in us], [x['drawn'] for x in us])),
                 cond('the share dismounted is a number (a printed fraction or a registered rule), not an open gap', dr.get('share') is not None or bool(dr.get('share_rule')), 'share %s, tier %s' % (dr.get('share'), dr.get('share_tier'))),
                 cond('the unit shows horse holders: one in four of the dismounted', all(((x.get('dismount') or {}).get('roles') or {}).get('hold') is not None for x in us if x['drawn']) and any(x['drawn'] for x in us), 'roles %s' % [((x.get('dismount') or {}).get('roles')) for x in us if x['drawn']])]
        bad = first_failed(conds)
        rec.item('Q20/Q20.6/dismount-%s/default' % dr['id'], 'FAIL' if bad else 'PASS', ('dismounted fight %s: ' % dr['id'] + '; '.join(bad)) if bad else 'the dismounted fight is shown with its horse holders', {'conditions': conds, 'record': dr}, check='Q20.6', scenario='default', subjects=sorted(x['id'] for x in us) or [dr['id']], sub_requirements=rows)
    if K.get('actions') is None:
        rec.owe('Q20.2 needs the B.6.15.3 action table of the cavalry (June 26 to July 16, conflicts as ranges) as a machine table, kit/cavalry_action_table.json, before any presence interval can be compared')
    if T is None:
        rec.owe('Q20.1 needs kit/verified_oob.json (the table of Q01) to be written by its owner')
    rec.owe('Q20.6: a time-keyed schedule of the cavalry states per unit does not exist in the product; the foot-contact test checks the structure of the gaits, not documented speeds (G-ANIM-07)')
    if K.get('missing'):
        rec.incomplete('inputs missing: %s' % '; '.join(K['missing']))


def run(env, dump=None, inputs=None, write=True, mutate=None, argv=None, gait='run', gap_cover=None, table_path=None):
    rec = Record(GATE, env, renderer_class='mixed', argv=argv)
    rec.tool_versions['node'] = node_version()
    runner_version(rec, [os.path.join(HERE, fn) for fn in ('q20_cavalry.py', 'q20_layer.mjs', 'oob_layer_lib.mjs', 'oobgates_common.py')])
    K = inputs if inputs is not None else load_inputs(rec, env, table_path)
    D = dump if dump is not None else layer_dump(env, 'q20_layer.mjs', [], mutate=mutate)
    g = gait_test(env) if gait == 'run' else gait
    evaluate(rec, env, D, K, g, gap_cover)
    rec.extra['verified_oob_table'] = {'path': env.rel(table_path) if table_path else 'docs/battle-theatre/' + TABLE_REL, 'present': K.get('table') is not None, 'schema': (K.get('table') or {}).get('schema'),
                                       'units': len((K.get('table') or {}).get('units') or {}), 'diagnostic_copy': bool(table_path)}
    if table_path:
        rec.note('DIAGNOSTIC RUN: the order-of-battle table was read from %s, not from kit/verified_oob.json; this record is not the gate result' % env.rel(table_path))
    out = rec.finish()
    if write:
        rec.write(out)
    return rec, out


def main(argv=None):
    ap = base_parser(__doc__.split('\n')[0])
    ap.add_argument('--mutate', default=None, help='test hook: a module that injects a defect into the real pipeline (see oob_layer_lib.mjs)')
    ap.add_argument('--no-gait-test', action='store_true', help='do not run the application gait test (the item is then NOT-RUN)')
    ap.add_argument('--table', default=None, help='diagnostic: read the order-of-battle table from this path (for example a scratch build of kit_verified.py); refused when the record would go to GOVERNANCE/gate_results')
    a = ap.parse_args(argv)
    env = Env(root=a.root, out=a.out)
    if a.table and os.path.abspath(env.out) == os.path.abspath(os.path.join(env.gov, 'gate_results')) and not a.no_write:
        sys.stderr.write('refused: --table is a diagnostic; give --out <scratch folder> or --no-write\n')
        return 3
    rec, out = run(env, write=not a.no_write, mutate=a.mutate, gait=None if a.no_gait_test else 'run', table_path=a.table, argv=['python3', 'tools/bt/gates/q20_cavalry.py'] + list(argv if argv is not None else sys.argv[1:]))
    if not a.quiet:
        c = out['counts']
        print('Q20 verdict %s: %d items, PASS %d, COVERED %d, FAIL %d, NOT-RUN %d, BLOCKED-INPUT %d, N/A %d' % (out['verdict'], out['totals']['items'], c['PASS'], c['COVERED'], c['FAIL'], c['NOT-RUN'], c['BLOCKED-INPUT'], c['N/A']))
    return {'PASS': 0, 'FAIL': 1, 'INCOMPLETE': 2}[out['verdict']]


if __name__ == '__main__':
    guarded_main(main)
