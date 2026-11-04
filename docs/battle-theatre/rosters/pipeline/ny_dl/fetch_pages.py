import sys,re,html,json; sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\ny')
from fetch import *
um=json.load(open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\unitmap.json'))
pages=sorted({u['page'] for u in um.values() if u['page']})
out={}
pd=os.path.join(CACHE,'nysmm_pages'); os.makedirs(pd,exist_ok=True)
for p in pages:
    slug=p.split('/unit-history/')[1].replace('/','__')
    fn=os.path.join(pd,slug+'.html')
    if os.path.exists(fn): h=open(fn,encoding='utf-8').read()
    else:
        try:
            st,b=get(p); h=b.decode('utf-8','replace'); open(fn,'w',encoding='utf-8').write(h)
        except Exception as e:
            print(p,'ERR',e,flush=True); out[p]={'error':str(e)}; continue
    ls=[]
    for m in re.finditer(r'href="(https?://www\.nysmm\.org/download_file/view/\d+)"[^>]*>(.{0,120}?)</a>',h,re.S):
        ls.append((m.group(1),html.unescape(re.sub('<[^>]+>','',m.group(2))).strip()))
    out[p]=ls
    print(p.split('/unit-history/')[1],[(l[1],l[0].split('/')[-1]) for l in ls if re.search('Roster|Muster|Casualt',l[1],re.I)],flush=True)
json.dump(out,open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\pagelinks.json','w'),indent=1)
