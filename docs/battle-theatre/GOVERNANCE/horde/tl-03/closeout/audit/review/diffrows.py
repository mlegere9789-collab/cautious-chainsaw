import json,sys
G='/home/user/cautious-chainsaw/'
A={json.loads(l)['id']:json.loads(l) for l in open(G+'tmp/tl-03/backup-20261116/tl-03.jsonl')}
B={json.loads(l)['id']:json.loads(l) for l in open(G+'docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-03.jsonl')}
assert list(A)==list(B)
tot=0
for rid in A:
    a,b=A[rid],B[rid]; ch=[]
    for k in b:
        if k in ('citations','sub_claims','corrected_claim','scenarios','recheck_applied','searched'): continue
        if a.get(k)!=b.get(k): ch.append(k)
    for k in ('verdict',): pass
    # corrected_claim fields
    for f in b['corrected_claim']:
        if a['corrected_claim'].get(f)!=b['corrected_claim'].get(f): ch.append('cc.'+f)
    ac={c['key']:c for c in a['citations']}; bc={c['key']:c for c in b['citations']}
    added=[k for k in bc if k not in ac]; removed=[k for k in ac if k not in bc]
    ext=[k for k in bc if k in ac and (ac[k].get('quote')!=bc[k].get('quote'))]
    pg=[k for k in bc if k in ac and ac[k].get('printed_page')!=bc[k].get('printed_page')]
    if added: ch.append('cites+%s'%added)
    if removed: ch.append('cites-%s'%removed)
    if ext: ch.append('quotes_ext=%s'%ext)
    if pg: ch.append('PAGE_CHANGED=%s'%[(k,ac[k].get('printed_page'),bc[k].get('printed_page')) for k in pg])
    # sub claims
    sa=[(s['claim'],s['tier'],s['support'],tuple(s['citations'])) for s in a['sub_claims']]
    sb=[(s['claim'],s['tier'],s['support'],tuple(s['citations'])) for s in b['sub_claims']]
    if len(sb)!=len(sa): ch.append('subs %d->%d'%(len(sa),len(sb)))
    for i,(x,y) in enumerate(zip(sa,sb)):
        if x!=y:
            what=[n for n,(p,q) in zip(('claim','tier','support','cites'),zip(x,y)) if p!=q]
            ch.append('S%d:%s'%(i+1,'/'.join(what)))
    if a['scenarios']!=b['scenarios']: ch.append('scenarios %d->%d'%(len(a['scenarios']),len(b['scenarios'])))
    if a['recheck_applied']!=b['recheck_applied']: ch.append('recheck')
    if a['verdict']!=b['verdict']: ch.append('VERDICT %s->%s'%(a['verdict'],b['verdict']))
    if a['corrected_claim']['tier']!=b['corrected_claim']['tier']: ch.append('TIER %s->%s'%(a['corrected_claim']['tier'],b['corrected_claim']['tier']))
    if ch:
        tot+=1; print(rid,'|',', '.join(ch))
print('rows changed',tot,'of',len(A))
