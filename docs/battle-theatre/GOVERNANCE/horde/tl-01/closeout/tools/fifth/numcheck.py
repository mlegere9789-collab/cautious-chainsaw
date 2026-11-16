import json, re, sys
rows=[json.loads(l) for l in open('docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-01.jsonl')]
W2N={'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,'eight':8,'nine':9,'ten':10,'eleven':11,'twelve':12,'thirteen':13,'sixteen':16,'seventeen':17,'twenty':20,'forty':40,'fifty':50,'sixty':60,'hundred':100,'thousand':1000}
def toks(t):
    t=t.replace('—',' ').replace('–','-')
    out=set()
    for m in re.finditer(r'\d[\d,]*(?:\.\d+)?',t):
        out.add(m.group(0).replace(',','').rstrip('.'))
    return out
def words(t):
    return set(w for w in re.findall(r'[a-z]+',t.lower()) if w in W2N)
flag=0; tot=0
only=set(sys.argv[1:])
for r in rows:
    cites={c['key']:c for c in r['citations']}
    for s in r['sub_claims']:
        if s['tier']!='documented' or s['support'] not in ('supported','conflict','contradicted'): continue
        tot+=1
        src=' '.join((cites[k]['quote']+' '+(cites[k].get('reading') or '')+' '+(cites[k].get('image_check') or '')) for k in s['citations'] if k in cites)
        have=toks(src); 
        miss=[n for n in toks(s['claim']) if n not in have and not re.fullmatch(r'1[89]\d\d|27|28|29|30|26|25|31|[12]?\d',n) ]
        if miss and (not only or r['id'] in only):
            flag+=1
            print(r['id'],s['n'],'missing numbers:',miss,'|',s['claim'][:140])
print('documented sub-claims',tot,'flagged',flag)
