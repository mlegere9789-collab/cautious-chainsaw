"""Coverage table for positions_<SCOPE>.jsonl: python -I tools/bt/positions_cov.py D"""
import os, sys, json, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
scope = sys.argv[1] if len(sys.argv) > 1 else 'D'
U = {u['id']: u for u in json.load(open(os.path.join(ROOT, 'docs/battle-theatre/history/units.json'), encoding='utf-8'))['units']}
C = [json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/history/positions/positions_%s.jsonl' % scope), encoding='utf-8')]
by = collections.defaultdict(list)
for c in C: by[c['unit_id']].append(c)
def desc(i):
    out = [i]
    for ch in U[i].get('children') or []: out += desc(ch)
    return out
scopeids = [i for i in U if U[i]['army'] == 'CS' and U[i]['level'] in ('brigade', 'artillery_battalion', 'group', 'command', 'headquarters', 'division', 'corps', 'artillery_group') ]
for i in scopeids:
    own = by.get(i, [])
    allc = [c for d in desc(i) for c in by.get(d, [])]
    kinds = collections.Counter(c['kind'] for c in own)
    gaps = sum(1 for c in own if c['tier'] == 'open gap')
    print('%-34s %-18s own=%3d all=%3d kinds=%s gap=%d' % (i, U[i]['level'], len(own), len(allc), dict(kinds), gaps))
