import sys,json,csv,re; sys.path.insert(0,'.')
from wp import get
import unicodedata
API='https://en.wikipedia.org/w/api.php'
seed=list(csv.DictReader(open('../../../docs/battle-theatre/assets/data/commanders-seed.csv',encoding='utf8')))
res=json.load(open('wp_match.json'))
todo={}
for r in seed:
    if not r['rank']: continue
    nm=r['name']
    if res.get(nm): continue
    todo.setdefault(nm,r)
out={}
def norm(s):
    s=unicodedata.normalize('NFKD',s); s=''.join(c for c in s if not unicodedata.combining(c))
    s=re.sub(r'\(.*?\)','',s); s=re.sub(r'[.,\'"]',' ',s)
    return [t for t in s.lower().split() if t not in('jr','sr','ii','iii','iv')]
for i,(nm,r) in enumerate(todo.items()):
    q='%s %s %s'%(nm, r['rank'], re.sub(r'(Infantry|Volunteer|Regiment|Battery)','',r['unit'] or '').strip()[:40])
    try:
        d=get(API,{'action':'query','generator':'search','gsrsearch':q,'gsrlimit':4,'prop':'pageimages|extracts|pageprops','piprop':'name|original','exintro':1,'explaintext':1,'exlimit':4,'exchars':600,'ppprop':'wikibase_item','format':'json'},delay=1.0)
    except Exception as e:
        out[nm]={'err':str(e)}; continue
    pages=sorted((d.get('query',{}).get('pages',{})).values(), key=lambda p:p.get('index',9))
    n=norm(nm); last=n[-1]; first=n[0]
    hit=None
    for p in pages:
        tn=norm(p['title'])
        if tn and tn[-1]==last and (tn[0]==first or tn[0][0]==first[0]):
            hit=p; break
    out[nm]={'unit':r['unit'],'rank':r['rank'],'hit':None if not hit else {'title':hit['title'],'img':hit.get('pageimage'),'orig':hit.get('original',{}).get('source'),'qid':hit.get('pageprops',{}).get('wikibase_item'),'extract':hit.get('extract','')[:500]},'tops':[p['title'] for p in pages]}
    if i%40==0: json.dump(out,open('wp_search_unmatched.json','w'),indent=0); print(i,len(todo),flush=True)
json.dump(out,open('wp_search_unmatched.json','w'),indent=0); print('done',len(out))
