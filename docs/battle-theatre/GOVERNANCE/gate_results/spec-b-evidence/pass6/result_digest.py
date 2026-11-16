#!/usr/bin/env python3
"""A digest of the stored gate results (GOVERNANCE/gate_results/Qnn.json): per check the counts by result, the owed list and the commonest reasons of the items that do not pass.
Read-only. A reason is normalised (digits, quoted ids and long numbers folded) so that repeated reasons group.

    python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass6/result_digest.py [Q01 Q02 ...]    (default: every Qnn.json present)
"""
import collections, glob, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 6)))
D = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'gate_results')
want = sys.argv[1:] or None


def norm(s):
    s = str(s or '')
    s = re.sub(r"'[^']{1,80}'", "'X'", s)
    s = re.sub(r'"[^"]{1,80}"', '"X"', s)
    s = re.sub(r'\b[A-Za-z]{1,6}[-_][A-Za-z0-9_.:\-|]{3,}\b', 'ID', s)
    s = re.sub(r'\d[\d,.:]*', 'N', s)
    return re.sub(r'\s+', ' ', s)[:170]


for fn in sorted(glob.glob(os.path.join(D, 'Q[0-9][0-9].json'))):
    r = json.load(open(fn, encoding='utf-8'))
    g = r.get('gate')
    if want and g not in want:
        continue
    print('=' * 100)
    print('%s verdict %s runnable_here %s renderer_class %s run %s..%s' % (g, r.get('verdict'), r.get('runnable_here'), r.get('renderer_class'), r.get('started_utc'), r.get('finished_utc')))
    print('command:', r.get('command'))
    print('counts :', r.get('counts'))
    bc = (r.get('totals') or {}).get('by_check') or {}
    for k in sorted(bc):
        v = bc[k]
        print('  %-8s %s' % (k, ' '.join('%s=%d' % (a, b) for a, b in v.items() if b)))
    print('incomplete_reasons:', json.dumps(r.get('incomplete_reasons'))[:700])
    print('owed:')
    for o in (r.get('owed') or [])[:14]:
        print('   -', str(o)[:420])
    if len(r.get('owed') or []) > 14:
        print('   ... %d more' % (len(r['owed']) - 14))
    by = collections.defaultdict(collections.Counter)
    ex = {}
    for it in r.get('items') or []:
        if it.get('result') in ('PASS', 'N/A'):
            continue
        key = (it.get('check'), it.get('result'))
        n = norm(it.get('reason'))
        by[key][n] += 1
        ex.setdefault((key, n), (it.get('id'), str(it.get('reason'))[:260]))
    for key in sorted(by, key=lambda k: (str(k[0]), str(k[1]))):
        print('  --- %s %s (%d items)' % (key[0], key[1], sum(by[key].values())))
        for n, c in by[key].most_common(4):
            i, rs = ex[(key, n)]
            print('      %5d  e.g. %s :: %s' % (c, i, rs))
