"""First 260 characters (normalised) of the report that holds a stored citation: python3 -I tmp/tl-03/audit/head.py T1-126 good12 [T1-126 brown12 ...]"""
import os, sys, json, bisect
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import or27_find as F
IDX = {r['id']: r for r in json.load(open(os.path.join(ROOT, 'docs/battle-theatre/library/or27_index.json'), encoding='utf-8'))['records']}
rows = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-03.jsonl'), encoding='utf-8')}
a = sys.argv[1:]
for i in range(0, len(a), 2):
    c = next(x for x in rows[a[i]]['citations'] if x['key'] == a[i + 1])
    r = IDX[c['report_id']]; P = F.get_part(r['part'])
    ns = bisect.bisect_left(P.nmap, r['start_offset'])
    print('%s %s %s p.%s | %s' % (a[i], a[i + 1], c['report_id'], c['printed_page'], P.ntext[ns:ns + 260]))
