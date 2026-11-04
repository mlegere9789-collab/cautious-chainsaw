#!/usr/bin/env python
"""Validator and Q04 presence function for the arrivals history layer.

  python tools/bt/check_arrivals.py            # validate + self-tests, exit 1 on any failure

Reads docs/battle-theatre/history/{units,arrivals,not_on_field}.json (written by build_arrivals.py) and
docs/battle-theatre/GOVERNANCE/conflicts_structured.json.

presence_ok(unit_id, time_iso, scenario='default', location=None) -> bool
  True when the unit may be drawn on the field at that local-mean-time instant (a permission test: False means the PDF gating
  rules forbid drawing it). Rules (PDF B.2.4 gating rules, page 63):
  - unknown ids -> False; units with status never_on_field / never_main_field (or any such ancestor) -> False, except in a
    detached role (e.g. Hampton's rear guard at 'hunterstown' from 1863-07-02T16:30; Jones at 'fairfield' on Jul 3) which is
    True at that location only and from its start time;
  - otherwise the unit's own gate applies; a unit with no own gate inherits its parent's gate, up to the army level (armies have a
    gate derived as the earliest of their formations);
  - scenario: 'earliest' | 'default' | 'latest' | 'v<N>' (N-th printed arrival value of the nearest gate that has values).
"""
import sys, os, re, json
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
HIST = os.path.join(ROOT, 'docs', 'battle-theatre', 'history')
REG = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'conflicts_structured.json')

_D = {}


def load():
    if not _D:
        _D['units'] = json.load(open(os.path.join(HIST, 'units.json'), encoding='utf-8'))
        _D['arr'] = json.load(open(os.path.join(HIST, 'arrivals.json'), encoding='utf-8'))
        _D['nof'] = json.load(open(os.path.join(HIST, 'not_on_field.json'), encoding='utf-8'))
        _D['reg'] = json.load(open(REG, encoding='utf-8'))
        _D['u'] = {u['id']: u for u in _D['units']['units']}
        _D['gates'] = _D['arr']['gates']
        det = {}
        for r in _D['arr']['rows']:
            for d in r['detached_roles']:
                det.setdefault(d['unit'], []).append(d)
        _D['detached'] = det
    return _D


def _t(s):
    if isinstance(s, datetime):
        return s
    return datetime.fromisoformat(s)


def chain(uid):
    D = load()
    out = []
    while uid is not None:
        if uid not in D['u']:
            break
        out.append(uid)
        uid = D['u'][uid]['parent']
    return out


def gate_time(uid, scenario='default'):
    """Return (time_iso, gate_owner_id) for the nearest ancestor-or-self gate, or (None, None)."""
    D = load()
    for x in chain(uid):
        g = D['gates'].get(x)
        if not g or g['kind'] == 'none':
            continue
        t = None
        m = re.match(r'^v(\d+)$', scenario)
        if scenario in ('earliest', 'default', 'latest'):
            t = g.get(scenario) or (g.get('default') if scenario == 'latest' else None) or g.get('earliest')
        elif m:
            vals = g.get('values') or []
            i = int(m.group(1))
            if i < len(vals):
                t = vals[i]['t']
            else:
                continue
        else:
            raise ValueError('unknown scenario %r' % scenario)
        if t:
            return t, x
    return None, None


def presence_ok(unit_id, time_iso, scenario='default', location=None):
    D = load()
    if unit_id not in D['u']:
        return False
    when = _t(time_iso)
    ch = chain(unit_id)
    if location:
        for x in ch:
            for role in D['detached'].get(x, []):
                if role['location'].lower() == str(location).lower():
                    if when < _t(role['t_from']):
                        return False
                    if role.get('t_to') and when > _t(role['t_to']):
                        return False
                    return True
    for x in ch:
        if D['u'][x]['status'] in ('never_on_field', 'never_main_field'):
            return False
    t, owner = gate_time(unit_id, scenario)
    if t is None:
        return True  # no gate anywhere up the chain: validate() reports every such on-field unit
    return when >= _t(t)


# ----------------------------------------------------------------------------------------------------------------------------
FAILS = []


def need(cond, msg):
    if not cond:
        FAILS.append(msg)
    return cond


def is_weak(k, pats):
    return any(re.search(p, k) for p in pats)


def validate():
    D = load()
    U, arr, reg = D['u'], D['arr'], D['reg']
    pats = arr['meta']['weak_source_patterns']
    cids = {c['id'] for c in reg['conflicts']}
    need(len(D['units']['units']) == len(U), 'duplicate unit ids in units.json')
    need(len(arr['rows']) == 44, 'arrivals rows %d != 44' % len(arr['rows']))
    ids = [r['id'] for r in arr['rows']]
    need(len(set(ids)) == len(ids), 'duplicate row ids')
    # units: parents, children, status, names
    valid_status = {'on_field', 'partly_on_field', 'never_on_field', 'never_main_field'}
    for u in U.values():
        need(u['parent'] is None or u['parent'] in U, 'unit %s: missing parent %s' % (u['id'], u['parent']))
        need(u['status'] in valid_status, 'unit %s: bad status %s' % (u['id'], u['status']))
        need(u['army'] in ('US', 'CS'), 'unit %s: bad army' % u['id'])
        need(bool(u['name_printed']), 'unit %s: no printed name' % u['id'])
        for c in u.get('children', []):
            need(c in U and U[c]['parent'] == u['id'], 'unit %s: bad child %s' % (u['id'], c))
    roots = [u['id'] for u in U.values() if u['parent'] is None]
    need(sorted(roots) == ['cs-anv', 'us-aop'], 'roots are %s' % roots)
    for r in arr['rows']:
        need(r['unit_id'] in U, 'row %s: unit missing' % r['id'])
        need(r['army'] == U[r['unit_id']]['army'], 'row %s: army mismatch' % r['id'])
        # weak/non-weak recomputed
        keys = r['source_keys']['all']
        need(r['source_keys']['weak'] == [k for k in keys if is_weak(k, pats)], 'row %s: weak list mismatch' % r['id'])
        need(r['source_keys']['non_weak'] == [k for k in keys if not is_weak(k, pats)], 'row %s: non_weak list mismatch' % r['id'])
        need(r['tier'] in ('documented', 'inferred', 'open gap'), 'row %s: bad tier %s' % (r['id'], r['tier']))
        if r['tier'] == 'documented':
            need(bool(r['source_keys']['non_weak']), "row %s: tier 'documented' but only weak source keys (%s)" % (r['id'], keys))
        if r['source_keys']['weak_source']:
            need(r['tier'] != 'documented', 'row %s: weak_source row marked documented' % r['id'])
        need(r['source_keys']['claim_support_verified'] is False, 'row %s: claim_support_verified must be false' % r['id'])
        for c in r['conflicts']:
            need(c['id'] in cids, 'row %s: conflict %s not in the register' % (r['id'], c['id']))
        g = r['gate']
        seq = [x for x in (g['earliest'], g['default'], g['latest']) if x]
        need(seq == sorted(seq), 'row %s: earliest<=default<=latest violated %s' % (r['id'], seq))
        need(not (g['kind'] == 'printed_clock' and not g['earliest']), 'row %s: printed_clock without earliest' % r['id'])
        for k in ('first_on_field', 'night_positions', 'left_or_moved'):
            need(r['cell_status'].get(k) is not None, 'row %s: no cell_status for %s' % (r['id'], k))
        fo = r['first_on_field']
        if fo['earliest']:
            need(fo['earliest'] <= fo['default'] <= fo['latest'], 'row %s: first_on_field order' % r['id'])
        for v in fo['values']:
            need(re.match(r'^1863-(06|07)-\d\dT\d\d:\d\d$', v['t']) is not None, 'row %s: bad time %s' % (r['id'], v['t']))
        for nm, nv in r['night_positions']['nights'].items():
            need(nv['status'] in ('printed', 'gap_printed', 'gap_not_mentioned'), 'row %s: night status' % r['id'])
    for sg in arr['subunit_gates']:
        need(sg['unit'] in U, 'subunit gate unit %s missing' % sg['unit'])
        need(sg['row'] in ids, 'subunit gate row %s missing' % sg['row'])
        need(sg['earliest'] <= sg['default'] <= sg['latest'], 'subunit %s: order' % sg['unit'])
        if sg['tier'] == 'documented':
            srcs = sg['sources'] or next(r for r in arr['rows'] if r['id'] == sg['row'])['source_keys']['all']
            need(any(not is_weak(k, pats) for k in srcs), "subunit %s: 'documented' with only weak keys" % sg['unit'])
    for uid, g in D['gates'].items():
        need(uid in U, 'gate for unknown unit %s' % uid)
        seq = [x for x in (g.get('earliest'), g.get('default'), g.get('latest')) if x]
        need(seq == sorted(seq), 'gate %s: order %s' % (uid, seq))
    for i, c in enumerate(D['nof']['gating_rules'][:5]):
        need(c['rule_no'] == i + 1, 'gating rule numbering')
    for side in ('union', 'confederate'):
        need(len(D['nof'][side]) in (3, 4), 'not_on_field %s rows' % side)
    for x in D['nof']['units']:
        need(x['id'] in U and U[x['id']]['status'] != 'on_field', 'not_on_field unit %s not marked' % x['id'])
    # every on-field unit resolves a gate (otherwise it is ungated)
    ungated = [u['id'] for u in U.values() if u['status'] in ('on_field', 'partly_on_field') and gate_time(u['id'], 'default')[0] is None]
    need(not ungated, 'on-field units with no gate up the chain: %s' % ungated[:10])
    # scenario monotonicity for every unit
    for u in U.values():
        if u['status'] not in ('on_field', 'partly_on_field'):
            continue
        a, d, l = (gate_time(u['id'], s)[0] for s in ('earliest', 'default', 'latest'))
        if a and d and l:
            need(a <= d <= l, 'unit %s: scenario order %s %s %s' % (u['id'], a, d, l))
    # nothing may be present before the first possible arrival (US cavalry Jun 30 11:00)
    for u in U.values():
        if u['status'] in ('on_field', 'partly_on_field'):
            for s in ('earliest', 'default', 'latest'):
                need(not presence_ok(u['id'], '1863-06-30T10:59', s), 'unit %s present before 1863-06-30T10:59 (%s)' % (u['id'], s))
    return ungated


def selftests():
    P = presence_ok
    D = load()
    U = D['u']
    T = need
    # Pickett's division: default gate = sunrise Jul 3 (04:36)
    for uid in ('cs-1c-pickett', 'cs-1c-pickett-kemper', 'cs-1c-pickett-garnett-8va'):
        T(uid in U, 'selftest unit %s missing' % uid)
        T(not P(uid, '1863-07-03T04:35'), '%s present before 04:36 Jul 3 (default)' % uid)
        T(P(uid, '1863-07-03T04:36'), '%s absent at 04:36 Jul 3 (default)' % uid)
        T(P(uid, '1863-07-03T13:00'), '%s absent at 13:00 Jul 3' % uid)
        T(not P(uid, '1863-07-02T12:00'), '%s present at noon Jul 2' % uid)
        T(not P(uid, '1863-07-02T20:03', 'earliest') and P(uid, '1863-07-02T20:04', 'earliest'), '%s earliest scenario boundary (night of Jul 2, 20:04)' % uid)
    T(not P('cs-1c-pickett', '1863-07-03T04:35'), 'Pickett default before sunrise')
    # Huey's brigade never present
    T('us-cav-2d-huey' in U, 'Huey unit missing')
    for t in ('1863-07-01T12:00', '1863-07-02T12:00', '1863-07-02T23:00', '1863-07-03T12:00'):
        for s in ('earliest', 'default', 'latest'):
            T(not P('us-cav-2d-huey', t, s), 'Huey present at %s (%s)' % (t, s))
        T(not P('us-cav-2d-huey', t, 'default', 'westminster'), 'Huey present at Westminster %s (not on the field)' % t)
    # Stuart's brigades: False before 19:32 Jul 2 except Hampton's rear guard at Hunterstown
    for uid in ('cs-cav-hampton', 'cs-cav-flee-chambliss', 'cs-cav-flee', 'cs-cav-chambliss', 'cs-cav-jenkins', 'cs-cav-hampton-1nc'):
        T(uid in U, 'selftest unit %s missing' % uid)
        for t in ('1863-07-01T12:00', '1863-07-02T12:00', '1863-07-02T16:30', '1863-07-02T19:31'):
            T(not P(uid, t), '%s present at %s before the evening of Jul 2' % (uid, t))
        T(P(uid, '1863-07-02T19:32'), '%s absent at 19:32 Jul 2' % uid)
        T(P(uid, '1863-07-03T11:00'), '%s absent at 11:00 Jul 3' % uid)
    T(P('cs-cav-hampton', '1863-07-02T16:30', 'default', 'hunterstown'), "Hampton's rear guard absent at Hunterstown 16:30")
    T(not P('cs-cav-hampton', '1863-07-02T16:29', 'default', 'hunterstown'), "Hampton's rear guard present at Hunterstown before 16:30")
    T(not P('cs-cav-hampton', '1863-07-02T16:30', 'default', 'gettysburg'), 'Hampton present at a location other than Hunterstown before the evening')
    T(not P('cs-cav-jenkins', '1863-07-02T16:30', 'default', 'hunterstown'), 'Jenkins has no Hunterstown exemption')
    T(not P('cs-cav-flee-chambliss', '1863-07-02T16:30', 'default', 'hunterstown'), 'F. Lee/Chambliss have no Hunterstown exemption')
    # Robertson/Jones/Imboden: never on the main field; Jones at Fairfield on Jul 3
    for uid in ('cs-cav-robertson', 'cs-cav-jones', 'cs-cav-imboden', 'cs-cav-robertson-jones-imboden'):
        T(uid in U and not P(uid, '1863-07-03T12:00'), '%s present on the main field' % uid)
    T(P('cs-cav-jones', '1863-07-03T12:00', 'default', 'fairfield'), 'Jones absent at Fairfield Jul 3')
    T(not P('cs-cav-jones', '1863-07-02T12:00', 'default', 'fairfield'), 'Jones at Fairfield before Jul 3')
    T(not P('cs-cav-robertson', '1863-07-03T12:00', 'default', 'fairfield'), 'Robertson at Fairfield')
    # other not-on-field items
    for uid in ('us-6c-2d-1brig', 'us-art-reserve-taft-1ctheavy-b', 'us-art-reserve-taft-1ctheavy-m', 'us-4nj-train-guard', 'us-5c-1d-sweitzer-32ma-co-c',
                'cs-13va-winchester', 'cs-58va-winchester', 'cs-44nc-hanover-junction', 'cs-corse-hanover-junction'):
        T(uid in U and not P(uid, '1863-07-03T12:00'), '%s should never be on the field' % uid)
    T(P('us-5c-1d-sweitzer-32ma', '1863-07-03T12:00'), '32nd MA (minus Co. C) should be present')
    T(P('us-art-reserve-taft-1ctheavy', '1863-07-03T12:00'), '1st CT Heavy (partly) should be present')
    # unknown ids
    T(not P('no-such-unit', '1863-07-02T12:00'), 'unknown id present')
    T(not P('', '1863-07-02T12:00'), 'empty id present')
    # no 5th NY infantry
    five = [u for u in U.values() if u['name'] == '5th NY' or re.match(r'^5th NY\b', u['name'])]
    T(not [u for u in five if u['arm'] == 'infantry'], 'a 5th NY INFANTRY regiment is in the order of battle: %s' % [u['id'] for u in five if u['arm'] == 'infantry'])
    arms = sorted((u['arm'], u['parent']) for u in five)
    T(arms == [('artillery', 'us-art-reserve-taft'), ('cavalry', 'us-cav-3d-farnsworth')], 'the 5th NY entries must be a Reserve battery and a cavalry regiment, got %s' % arms)
    T(P('us-cav-3d-farnsworth-5ny', '1863-07-02T16:30') and not P('us-cav-3d-farnsworth-5ny', '1863-07-02T16:29'), '5th NY cavalry follows the 3rd Cavalry Division gate (16:30 Jul 2)')
    # presence of ordinary printed-clock units
    T(not P('us-3c-2d', '1863-07-01T23:59') and P('us-3c-2d', '1863-07-02T02:00') and not P('us-3c-2d', '1863-07-01T23:59', 'default'), 'Humphreys default 02:00')
    T(P('us-3c-2d', '1863-07-02T00:00', 'earliest') and not P('us-3c-2d', '1863-07-01T23:59', 'earliest'), 'Humphreys earliest 00:00')
    T(not P('us-1c-1d', '1863-07-01T10:19') and P('us-1c-1d', '1863-07-01T10:20'), 'I Corps 1st Division at 10:20')
    T(not P('us-1c-3d-stannard', '1863-07-02T17:59') and P('us-1c-3d-stannard', '1863-07-02T18:00'), 'Stannard earliest documented sighting 18:00 Jul 2')
    T(not P('us-1c-3d-stannard-13vt', '1863-07-02T17:59'), 'Stannard regiments inherit the brigade gate')
    T(not P('us-12c-1d-lockwood', '1863-07-02T07:59') and P('us-12c-1d-lockwood', '1863-07-02T08:00'), 'Lockwood 08:00 Jul 2')
    T(P('us-12c-1d-mcdougall', '1863-07-01T17:30') and not P('us-12c-1d-mcdougall', '1863-07-01T17:29'), 'XII Corps 1st Division brigades inherit 17:30 Jul 1')
    T(not P('cs-3c-heth', '1863-07-01T07:29') and P('cs-3c-heth', '1863-07-01T07:30'), 'Heth 07:30 Jul 1')
    T(P('cs-3c', '1863-07-01T07:30') and not P('cs-3c', '1863-07-01T07:29'), 'III Corps gate derived from divisions')
    T(not P('cs-1c-hood', '1863-07-02T05:29', 'earliest') and P('cs-1c-hood', '1863-07-02T05:30', 'earliest'), 'Hood earliest 05:30')
    T(not P('cs-1c-hood', '1863-07-02T06:29') and P('cs-1c-hood', '1863-07-02T06:30'), 'Hood default 06:30')
    T(not P('cs-1c-hood', '1863-07-02T07:29', 'latest') and P('cs-1c-hood', '1863-07-02T07:30', 'latest'), 'Hood latest 07:30')
    T(not P('cs-1c-res-art-alexander', '1863-07-02T08:59') and P('cs-1c-res-art-alexander', '1863-07-02T09:00'), 'Alexander default 09:00')
    T(P('cs-1c-res-art-alexander', '1863-07-02T07:00', 'earliest') and not P('cs-1c-res-art-alexander', '1863-07-02T06:59', 'earliest'), 'Alexander earliest 07:00')
    T(not P('cs-1c-res-art-alexander-ashland', '1863-07-02T08:59'), 'Alexander batteries inherit the battalion gate')
    T(not P('us-5c-3d', '1863-07-02T18:59') and P('us-5c-3d', '1863-07-02T19:00'), 'Pennsylvania Reserves event floor 19:00 Jul 2')
    T(not P('us-aop', '1863-06-30T10:59') and P('us-aop', '1863-06-30T11:00'), 'Army of the Potomac derived gate')
    T(not P('cs-anv', '1863-07-01T07:29') and P('cs-anv', '1863-07-01T07:30'), 'Army of Northern Virginia derived gate')
    T(P('us-1c-1d', '1863-07-03T12:00'), 'present later in the battle')
    T(P('cs-1c-pickett', '1863-07-04T12:00'), 'present on Jul 4')
    # scenario selectors: vN picks the N-th printed arrival value
    T(P('us-2c', '1863-07-01T22:30', 'v0') and not P('us-2c', '1863-07-01T22:29', 'v0'), 'II Corps v0 = 22:30 Jul 1')
    T(P('us-2c', '1863-07-02T07:00', 'v2') and not P('us-2c', '1863-07-02T06:59', 'v2'), 'II Corps v2 = 07:00 Jul 2')
    try:
        P('us-2c', '1863-07-02T07:00', 'bogus')
        T(False, 'unknown scenario accepted')
    except ValueError:
        pass


def main():
    ungated = validate()
    selftests()
    D = load()
    arr = D['arr']
    from collections import Counter
    tiers = Counter(r['tier'] for r in arr['rows'])
    print('units: %d  rows: %d  subunit gates: %d  gates: %d  unparsed cells: %d' % (len(D['u']), len(arr['rows']), len(arr['subunit_gates']), len(D['gates']), len(arr['unparsed'])))
    print('row tiers:', dict(tiers))
    print('weak-source-only rows:', [r['id'] for r in arr['rows'] if r['source_keys']['weak_source']])
    print('rows by first-on-field status:', dict(Counter(r['first_on_field']['parse_status'] for r in arr['rows'])))
    if ungated:
        print('ungated on-field units:', len(ungated))
    if FAILS:
        for f in FAILS:
            print('FAIL', f)
        print('check_arrivals: %d failure(s)' % len(FAILS))
        sys.exit(1)
    print('check_arrivals: OK (validation + self-tests passed)')


if __name__ == '__main__':
    main()
