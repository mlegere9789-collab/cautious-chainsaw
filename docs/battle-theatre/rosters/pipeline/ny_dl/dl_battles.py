import sys,re,json; sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\ny')
from fetch import *
import urllib.error
um=json.load(open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\unitmap.json'))
pl=json.load(open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\pagelinks.json'))
done=set()
bd=os.path.join(CACHE,'battles'); os.makedirs(bd,exist_ok=True)
for uid,u in um.items():
    p=u['page']
    if not p or p in done: continue
    done.add(p)
    links=pl.get(p) if isinstance(pl.get(p),list) else []
    for url,label in links:
        if not label.startswith('Battles'): continue
        num=url.rstrip('/').split('/')[-2] if re.search(r'/\d+/\d+$',url) else url.rstrip('/').split('/')[-1]
        if any(f.startswith('b_%s_'%num) for f in os.listdir(bd)): continue
        try:
            polite()
            req=urllib.request.Request(url.replace('http://','https://'),headers={'User-Agent':UA})
            r=urllib.request.urlopen(req,timeout=120)
            final=r.geturl(); b=r.read(); ext=os.path.splitext(final.split('?')[0])[1].lower() or '.bin'
            fn='b_%s_%s%s'%(num,p.split('/')[-1][:30],ext)
            open(os.path.join(bd,fn),'wb').write(b)
            acq=load_acq()
            acq['files'].append({'url':url,'final_url':final,'unit_page':p,'label':label,'unit_ids':[k for k,v in um.items() if v['page']==p],'file':'battles/'+fn,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'content_type':r.headers.get('Content-Type'),'http_status':r.status,'retrieved':datetime.datetime.now().isoformat(timespec='seconds')})
            json.dump(acq,open(ACQ,'w',encoding='utf-8'),indent=1)
            print(uid,label,len(b),ext,flush=True)
        except urllib.error.HTTPError as e:
            print(uid,label,'HTTP',e.code,url,flush=True)
        except Exception as e:
            print(uid,label,'ERR',e,flush=True)
print('total done')
