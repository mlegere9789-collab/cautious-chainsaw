"""List OR27 citations of timeline_corrections/tl-03.jsonl whose stored printed page differs from the printed page of the scan leaf
(tools/bt/kit_or27_leafmap.py).  python3 -I tmp/tl-03/audit/pagecheck.py"""
import os, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import kit_or27_leafmap as KL
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-03.jsonl'), encoding='utf-8')]
lms = {p: KL.load(p) for p in (1, 2, 3)}
n = same = diff = nopg = 0
leaves = collections.OrderedDict()
for r in rows:
    for c in r['citations']:
        if c['source_id'] != 'OR27':
            continue
        n += 1
        lm = lms[c['part']]
        a, b = lm.at(c['text_offset']), lm.at(c['text_offset_end'] - 1)
        leaves.setdefault((c['part'], a['leaf']), a['page'])
        leaves.setdefault((c['part'], b['leaf']), b['page'])
        stored = str(c['printed_page'])
        pg = str(a['page']) if a['page'] is not None else None
        span = a['leaf'] != b['leaf']
        ok = (pg is not None and (stored == pg or stored.endswith(pg) or pg in stored.replace('(', ' ').replace(')', ' ').replace('-', ' ').split()))
        if stored == pg and not span:
            same += 1
        else:
            diff += 1
            print('%s %-12s stored p.%-14s leaf-map p.%-6s (leaf %s%s) %s' % (r['id'], c['key'], stored, pg, a['leaf'], '..%s p.%s' % (b['leaf'], b['page']) if span else '', c.get('report_id')))
print('OR27 citations', n, 'identical page', same, 'different or spanning', diff, '| distinct leaves', len(leaves), '| leaves without printed page', sum(1 for v in leaves.values() if v is None))
