import json, re, sys
ROOT = '/home/user/cautious-chainsaw'; G = ROOT + '/docs/battle-theatre/GOVERNANCE'
rows = {json.loads(l)['id']: json.loads(l) for l in open(G + '/timeline_corrections/tl-01.jsonl', encoding='utf-8')}
HARM = set(['26','27','28','29','30','1','3','1863','25','24','03:00','01:00','3.15','8.30','10','62','89','6','5','7'])
lo, hi = sys.argv[1], sys.argv[2]
for l in open(ROOT + '/tmp/tl-01/audit/tokctx.pass3.txt', encoding='utf-8'):
    m = re.match(r'(T1-\d+) sub (\d+)\s+missing (\[.*?\])\s+NOT-NEARBY (\[.*\])', l)
    if not m or not (lo <= m.group(1) <= hi): continue
    miss = eval(m.group(3))
    rest = [t for t in miss if t not in HARM]
    if not rest: continue
    r = rows[m.group(1)]; s = r['sub_claims'][int(m.group(2)) - 1]; cit = {c['key']: c for c in r['citations']}
    print('%s s%s missing %s\n   CLAIM: %s' % (m.group(1), m.group(2), rest, s['claim'][:230]))
    for k in s['citations']:
        c = cit[k]; print('   Q[%s]: %s' % (k, (c.get('reading') or c['quote'])[:190]))
