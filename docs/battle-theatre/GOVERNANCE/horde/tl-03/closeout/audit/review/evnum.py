import json,re
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-03.jsonl')]
W={'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,'eight':8,'nine':9,'ten':10,'eleven':11,'twelve':12,'fifteen':15,'twenty':20,'thirty':30,'forty':40,'fifty':50}
def nums(s):
    s=re.sub(r'(\d),(\d{3})',r'\1\2',s)
    out=set(re.findall(r'\d+(?:\.\d+)?',s))
    return out
for r in rows:
    cc=r['corrected_claim']
    ev=cc['event']
    pool=' '.join(c.get('quote') or str(c.get('value')) for c in r['citations'])+' '+' '.join(s['claim'] for s in r['sub_claims'])+' '+' '.join(json.dumps(sc,ensure_ascii=False) for sc in r['scenarios'])
    pn=nums(pool)
    # number words in pool
    for w,v in W.items():
        if re.search(r'\b%s\b'%w,pool,re.I): pn.add(str(v))
    en=nums(re.sub(r'\(.*?\)','',ev))
    miss=sorted(n for n in en if n not in pn)
    if miss: print(r['id'],'event numbers not in quotes/subclaims/scenarios:',miss,'\n   ',ev[:260])
