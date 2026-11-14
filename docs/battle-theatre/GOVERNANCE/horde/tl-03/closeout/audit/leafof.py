"""python3 -I tmp/tl-03/audit/leafof.py T1-129 tab820 [T1-147 mor_str ...]  -> part:leaf and printed page of stored citations"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
import kit_or27_leafmap as KL
rows = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-03.jsonl'), encoding='utf-8')}
a = sys.argv[1:]
for i in range(0, len(a), 2):
    c = next(x for x in rows[a[i]]['citations'] if x['key'] == a[i + 1])
    lm = KL.load(c['part']); s = lm.at(c['text_offset']); e = lm.at(c['text_offset_end'] - 1)
    print('%s %s -> %d:%d (p.%s)%s | %s' % (a[i], a[i + 1], c['part'], s['leaf'], s['page'], (' .. %d:%d (p.%s)' % (c['part'], e['leaf'], e['page'])) if e['leaf'] != s['leaf'] else '', c['quote'][:70]))
