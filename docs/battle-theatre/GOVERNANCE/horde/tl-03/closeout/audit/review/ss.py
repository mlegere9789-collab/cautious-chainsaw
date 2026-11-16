import json,sys
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows={}
for l in open(G+'timeline_corrections/tl-03.jsonl'):
    o=json.loads(l); rows[o['id']]=o
for a in sys.argv[1:]:
    rid,n=a.split(':')
    r=rows[rid]; cit={c['key']:c for c in r['citations']}
    for s in r['sub_claims']:
        if str(s['n'])!=n: continue
        print('==',rid,'S%s [%s/%s]'%(n,s['tier'],s['support']),s['claim'])
        for k in s['citations']:
            c=cit[k]
            print('   [%s] %s %s p.%s :: %s'%(k,c['source_id'],c.get('report_id') or '',c['printed_page'],(c.get('quote') or c.get('what'))))
            if c.get('reading'): print('        reading:',c['reading'])
