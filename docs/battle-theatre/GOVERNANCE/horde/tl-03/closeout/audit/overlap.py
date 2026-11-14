"""Lexical overlap between each documented sub-claim and its cited quotes (lowest first): python3 -I tmp/tl-03/audit/overlap.py [N]"""
import json, re, sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
rows = [json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-03.jsonl'), encoding='utf-8')]
STOP = set('the a an of to in on at by for and or as was were is are be been with from that this it its his her their which who whom after before then than into over under between about not no but also he she they we i our out up down off may can could would should had has have did do does so such one two three four five six seven eight nine ten per them these those there here when where while during until near upon within without more most less other some any all each both either neither only just own same very said says say reports report row rows text source sources later earlier first last next day days jul jun july june 1863 1864 am pm approx approximately'.split())
def words(s):
    s = re.sub(r"[^a-z0-9'. ]", " ", s.lower())
    return [w.strip(".'") for w in s.split() if len(w.strip(".'")) > 2 and w.strip(".'") not in STOP]
res = []
for r in rows:
    cites = {c['key']: c for c in r['citations']}
    for s in r['sub_claims']:
        if s['tier'] != 'documented' or s['support'] not in ('supported', 'conflict'): continue
        q = ' '.join((cites[k].get('quote') or '') for k in s['citations'] if k in cites and cites[k]['source_id'] != 'COMPUTED')
        qs = set(w[:5] for w in words(q))
        cw = words(re.sub(r'\([^)]*\)', '', s['claim']))
        if not cw: continue
        res.append((sum(1 for w in cw if w[:5] in qs) / len(cw), r['id'], s['n'], len(cw), s['claim'][:150], q[:110]))
res.sort()
for x in res[:int(sys.argv[1]) if len(sys.argv) > 1 else 25]:
    print('%.2f %s sub%d (%d w) | %s || Q: %s' % x)
