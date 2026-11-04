"""Bridge between the kit data (docs/battle-theatre/kit, ids like US.2WI, CS.KERSHAW) and the arrivals gate (docs/battle-theatre/history,
ids like us-1c-1d-meredith-2wi, check_arrivals.presence_ok, gate Q04).

make_presence_fn(scenario) returns fn(kit_unit_id, date) for check_kit.validate_manifest(presence_fn=...).
  date is 'YYYY-MM-DD' or an ISO minute. A bare date means 'could the unit be on the field at some time that day', so it is tested at 23:59 LMT;
  an ISO minute is tested at that minute. Departures are not gated (presence_ok does not gate them).
Crosswalk rules (nothing is guessed):
  - regiment kit ids 'US.<n><ST>' / 'CS.<n><ST>' map to the single infantry regiment of that army whose history id ends '-<n><st>';
    more than one candidate = AMBIGUOUS (reported, not resolved).
  - brigade kit ids 'CS.<SURNAME>' map to the single brigade of that army whose history id ends '-<surname>'.
  - everything else (support troops, generic groups, Vermont brigades listed as 'US.VI_nVT', MN Co. L, 'CS.OTHERS') stays UNRESOLVED.
Unresolved or ambiguous units are NOT gated here (fn returns True) and are listed by coverage(); the caller must not treat True for them as an arrival check."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import check_arrivals as CA

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KIT = os.path.join(ROOT, 'docs', 'battle-theatre', 'kit', 'kit_specs.json')
HIST = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'units.json')
_C = {}

# Explicit crosswalk where the two id schemes differ; each entry is supported by the printed name/hierarchy of the kit unit.
ALIAS = {
    'US.13PAR': 'us-5c-3d-mccandless-13pareserves',
    'US.VI_2VT': 'us-6c-2d-grant-2vt', 'US.VI_3VT': 'us-6c-2d-grant-3vt', 'US.VI_4VT': 'us-6c-2d-grant-4vt',
    'US.VI_5VT': 'us-6c-2d-grant-5vt', 'US.VI_6VT': 'us-6c-2d-grant-6vt',
    'US.1USS': 'us-3c-1d-ward-1ussharpshooters', 'US.2USS': 'us-3c-1d-ward-2ussharpshooters',
    'US.1MASSSS': 'us-2c-2d-1comass',
    'CS.ANDERSON_GA': 'cs-1c-hood-anderson',            # kit: 'Anderson (GA) brigade'
    'CS.STEUART_NC': 'cs-2c-johnson-steuart',           # kit: "Steuart's NC regiments"; gated by their brigade
    'CS.3GASSBN': 'cs-1c-mclaws-wofford-3gasharpshooters',
}
# Left unresolved on purpose: CS.5ALBN (kit prints Rodes' division, the order of battle prints Archer's brigade in Heth's division: a PDF
# conflict, not mine to resolve), US.MN_CO_L (no history unit), CS.SCSSBN, CS.OTHERS, CS.SS_GENERIC, US.5NY_INF (not in the order of battle), US.SUP.*, CS.SUP.*.


def _load():
    if _C:
        return _C
    kit = json.load(open(KIT, encoding='utf-8'))['units']
    h = json.load(open(HIST, encoding='utf-8'))
    hu = h if isinstance(h, list) else h['units']
    army = {'US': 'US', 'CS': 'CS'}
    reg, brig = {}, {}
    for u in hu:
        suf = u['id'].rsplit('-', 1)[-1]
        if u['level'] == 'regiment' and u.get('arm') == 'infantry':
            reg.setdefault((u['army'], suf), []).append(u['id'])
        elif u['level'] == 'brigade':
            brig.setdefault((u['army'], suf), []).append(u['id'])
    xw, why = {}, {}
    for kid, k in kit.items():
        a, _, rest = kid.partition('.')
        m = re.match(r'^(\d+)([A-Z]+)$', rest)
        if m:
            cand = reg.get((a, m.group(1) + m.group(2).lower()), [])
        elif a == 'CS' and re.match(r'^[A-Z]+$', rest):
            cand = brig.get((a, rest.lower()), [])
        else:
            cand = []
        if kid in ALIAS:
            if ALIAS[kid] not in {u['id'] for u in hu}:
                raise ValueError('alias target missing: %s -> %s' % (kid, ALIAS[kid]))
            xw[kid] = ALIAS[kid]
        elif len(cand) == 1:
            xw[kid] = cand[0]
        else:
            why[kid] = 'ambiguous: %s' % cand if cand else 'unresolved'
    _C.update(xw=xw, why=why, kit=kit)
    return _C


def history_id(kit_id):
    return _load()['xw'].get(kit_id)


def make_presence_fn(scenario='default'):
    xw = _load()['xw']

    def fn(kit_id, date):
        hid = xw.get(kit_id)
        if hid is None:
            return True
        t = date if 'T' in date else date + 'T23:59'
        return CA.presence_ok(hid, t, scenario)
    return fn


def coverage():
    c = _load()
    return {'kit_units': len(c['kit']), 'resolved': len(c['xw']), 'unresolved': sorted(c['why'].items())}


def selftest():
    c = coverage()
    fn = make_presence_fn()
    xw = _load()['xw']
    problems = []
    # Pickett's Virginians: not on the field on Jul 2 at 12:00 by default, present at 12:00 on Jul 3
    for kid in ('CS.GARNETT', 'CS.ARMISTEAD', 'CS.KEMPER'):
        if kid not in xw:
            problems.append('%s unresolved' % kid)
            continue
        if fn(kid, '1863-07-02T12:00') or not fn(kid, '1863-07-03T12:00'):
            problems.append('%s gate wrong' % kid)
    # I Corps Iron Brigade regiment present on Jul 1 morning, absent Jun 30 night is not required (pre-battle floor)
    if 'US.2WI' in xw and not fn('US.2WI', '1863-07-01T12:00'):
        problems.append('US.2WI should be present at noon Jul 1')
    if xw.get('US.5NY_INF'):
        problems.append('US.5NY_INF must never resolve to a history unit')
    return c, problems


if __name__ == '__main__':
    c, p = selftest()
    print('kit units %d, resolved to a history unit %d, not gated here %d' % (c['kit_units'], c['resolved'], len(c['unresolved'])))
    for kid, w in c['unresolved']:
        print('  not gated: %-22s %s' % (kid, w))
    for x in p:
        print('PROBLEM', x)
    print('kit_presence: ' + ('OK' if not p else 'FAILED'))
    sys.exit(1 if p else 0)
