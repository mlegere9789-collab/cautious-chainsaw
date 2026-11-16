import json,sys
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows={json.loads(l)['id']:json.loads(l) for l in open(G+'timeline_corrections/tl-04.jsonl',encoding='utf-8')}
for a in sys.argv[1:]:
    rid,n=a.split(':'); r=rows[rid]; cit={c['key']:c for c in r['citations']}
    s=r['sub_claims'][int(n)-1]
    print('==',rid,'SUB',n,'[%s/%s]'%(s['tier'],s['support']),s['claim'][:400])
    for k in s['citations']:
        c=cit[k]; print('   [%s] %s p.%s | %s\n        Q: %s'%(k,c.get('report_id') or c['source_id'],c.get('printed_page'),(c.get('report_heading') or c.get('author') or '')[:110],(c.get('quote') or c.get('what'))[:500]))
