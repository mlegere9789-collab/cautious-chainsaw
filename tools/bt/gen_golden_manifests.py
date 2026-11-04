#!/usr/bin/env python3
"""Writes docs/battle-theatre/app/tests/golden-manifests.json: reference manifests made by tools/bt/check_kit.py manifest_for (the reference implementation of PDF B.6.12 kit manifests)
for the JS port in docs/battle-theatre/app/src/history/manifest.mjs to be compared with (tests/manifest.test.mjs). The file holds, for every kit unit that was at Gettysburg (both variants of a
disputed unit), a handful of soldiers on two dates and several ranks, as sha256 digests of the canonical JSON of the whole manifest, plus a few full manifests to read when a digest differs.
Also writes the synthetic default units the shell uses for units with no record of their own (same dict as Kit in manifest.mjs).
  PYTHONIOENCODING=utf-8 python tools/bt/gen_golden_manifests.py
Deterministic: no timestamp, fixed case list."""
import hashlib, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import check_kit as CK

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'app', 'tests', 'golden-manifests.json')
SEED = 1863
DATES = ('1863-07-01', '1863-07-03')
RANKS = ('private', 'private', 'corporal', 'sergeant', 'lieutenant', 'captain')


def add_defaults(kit):
    """Synthetic default units: identical to the constructor of Kit in manifest.mjs."""
    for side in ('union', 'confederate'):
        for arm in ('infantry', 'artillery', 'cavalry'):
            if 'default.%s.%s' % (side, arm) in kit.defaults:
                uid = 'DEFAULT.%s.%s' % (side, arm)
                kit.units[uid] = {'id': uid, 'name': 'default for %s %s' % (side, arm), 'army': side, 'scope': 'default', 'branch': arm, 'group': 'default', 'corps': None, 'division': None,
                                  'brigade': None, 'presence': {'status': 'present_at_gettysburg'}, 'inherits': 'default.%s.%s' % (side, arm), 'fields': {}, 'dispute_ids': []}


def _num(x):
    """A number the way JavaScript prints it (JSON.stringify): integers without a point, no exponent above 1e-6 (Python prints 5e-05 where JS prints 0.00005)."""
    if isinstance(x, bool):
        return 'true' if x else 'false'
    if isinstance(x, int):
        return str(x)
    if x == int(x) and abs(x) < 1e21:
        return str(int(x))
    r = repr(x)
    if 'e' in r or 'E' in r:
        from decimal import Decimal
        r = format(Decimal(r), 'f')
        if '.' in r:
            r = r.rstrip('0').rstrip('.')
    return r


def canon(o):
    """Canonical JSON identical to canon() in docs/battle-theatre/sim/cache.mjs: sorted keys, no spaces, numbers as JavaScript prints them."""
    if o is None:
        return 'null'
    if isinstance(o, (bool, int, float)):
        return _num(o)
    if isinstance(o, str):
        return json.dumps(o, ensure_ascii=False)
    if isinstance(o, (list, tuple)):
        return '[' + ','.join(canon(v) for v in o) + ']'
    return '{' + ','.join(json.dumps(k, ensure_ascii=False) + ':' + canon(o[k]) for k in sorted(o)) + '}'


def digest(m):
    return hashlib.sha256(canon(m).encode('utf-8')).hexdigest()[:24]


def main():
    kit = CK.get_kit()
    add_defaults(kit)
    cases, full, skipped = [], [], []
    for uid in sorted(kit.units):
        u = kit.units[uid]
        if u['presence']['status'] != 'present_at_gettysburg':
            skipped.append([uid, u['presence']['status']])
            continue
        variants = list(u['variants']) if u.get('variants') else [None]
        for var in variants:
            for si in range(4):
                sid = '%s:%04d' % (uid, si * 37 + (3 if si else 0))
                for di, date in enumerate(DATES):
                    rank = RANKS[(si * 2 + di) % len(RANKS)]
                    m = CK.manifest_for(sid, uid, SEED, date=date, rank=rank, role='rifleman', variant=var, kit=kit)
                    c = {'soldier_id': sid, 'unit': uid, 'date': date, 'rank': rank, 'variant': var, 'digest': digest(m)}
                    cases.append(c)
                    if len(full) < 30 and si == 0 and di == 0 and (uid.startswith('US.19IN') or uid.startswith('DEFAULT') or uid in ('US.114PA', 'CS.CAV.COBB', 'US.CAV.6PA', 'US.140NY', 'CS.KERSHAW')):
                        full.append({**c, 'manifest': m})
    doc = {'_doc': 'Reference manifests from tools/bt/check_kit.py manifest_for; see tools/bt/gen_golden_manifests.py. digest = first 24 hex of sha256 of the canonical JSON (sorted keys, no spaces) of the manifest.',
           'project_seed': SEED, 'units_with_cases': len({c['unit'] for c in cases}), 'cases': cases, 'full': full, 'skipped_not_present': skipped,
           'rng_golden': CK.GOLDEN}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=0)
        f.write('\n')
    print('golden manifests: %d cases over %d units (%d refused: not present at Gettysburg), %d full manifests -> %s' % (len(cases), doc['units_with_cases'], len(skipped), len(full), OUT))


if __name__ == '__main__':
    main()
