import json,csv,re,unicodedata
info=json.load(open('wp_links_info.json'))
seed=list(csv.DictReader(open('../../../docs/battle-theatre/assets/data/commanders-seed.csv',encoding='utf8')))
def norm(s):
    s=unicodedata.normalize('NFKD',s); s=''.join(c for c in s if not unicodedata.combining(c))
    s=re.sub(r'\(.*?\)','',s); s=re.sub(r'[.,\'"]',' ',s)
    return [t for t in s.lower().split() if t not in('jr','sr','ii','iii','iv')]
persons={}
for t,v in info.items():
    if not v: continue
    d=(v['desc'] or '').lower()
    persons[t]=v
def cands(name):
    n=norm(name)
    if not n: return []
    last=n[-1]; first=n[0]
    out=[]
    for t,v in persons.items():
        tn=norm(t)
        if not tn or tn[-1]!=last: continue
        f=tn[0]
        if f==first or (len(first)<=2 and f[0]==first[0]) or (len(f)<=2 and first[0]==f[0]) or first[0]==f[0] and len(first)>1 and (first.startswith(f) or f.startswith(first)):
            out.append(t)
    return out
res={}
for r in seed:
    nm=r['name']
    if nm in res or not r['rank']: continue
    c=cands(nm)
    # keep only those whose description looks like a person soldier
    c2=[t for t in c if re.search(r'general|officer|colonel|soldier|politician|army|civil war|cavalry|artillery|lawyer|businessman|planter|engineer|physician|educator|diplomat|congress|governor|military',(persons[t]['desc'] or '').lower())]
    res[nm]=c2 if c2 else c
amb=[(k,v) for k,v in res.items() if len(v)>1]
none=[k for k,v in res.items() if not v]
one=[k for k,v in res.items() if len(v)==1]
print(len(res),'one',len(one),'amb',len(amb),'none',len(none))
json.dump(res,open('wp_match.json','w'),indent=0)
for k,v in amb[:25]: print(k,v)
