import sys,re,json; sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\ny')
from fetch import *
import urllib.error
um=json.load(open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\unitmap.json'))
pl=json.load(open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\pagelinks.json'))
kinds=sys.argv[1].split(',') if len(sys.argv)>1 else ['Unit Roster']
only=set(sys.argv[2].split(',')) if len(sys.argv)>2 else None
done_pages=set()
acq=load_acq()
tot=sum(f['bytes'] for f in acq['files'])
for uid,u in um.items():
    p=u['page']
    if not p or p in done_pages: continue
    if only and uid not in only: continue
    done_pages.add(p)
    for url,label in pl.get(p,[]) if isinstance(pl.get(p),list) else []:
        if not any(label.startswith(k) for k in kinds): continue
        num=url.split('/')[-1]
        slug=p.split('/')[-1]
        dest=os.path.join(CACHE,'nysmm_%s_%s_%s.pdf'%(slug,re.sub(r'\W+','',label)[:12],num))
        if os.path.exists(dest): continue
        if tot>1.4e9: print('CAP reached'); sys.exit()
        try:
            polite()
            req=urllib.request.Request(url.replace('http://','https://'),headers={'User-Agent':UA})
            r=urllib.request.urlopen(req,timeout=180)
            final=r.geturl(); ct=r.headers.get('Content-Type'); h=hashlib.sha256(); n=0
            with open(dest+'.part','wb') as o:
                while True:
                    c=r.read(1<<20)
                    if not c: break
                    o.write(c); h.update(c); n+=len(c)
            os.replace(dest+'.part',dest); tot+=n
            acq=load_acq()
            acq['files'].append({'url':url,'final_url':final,'unit_page':p,'label':label,'unit_ids':[k for k,v in um.items() if v['page']==p],'file':os.path.basename(dest),'bytes':n,'sha256':h.hexdigest(),'content_type':ct,'http_status':r.status,'retrieved':datetime.datetime.now().isoformat(timespec='seconds')})
            json.dump(acq,open(ACQ,'w',encoding='utf-8'),indent=1)
            print(uid,label,n,final.split('/')[-1],flush=True)
        except urllib.error.HTTPError as e:
            print(uid,label,'HTTP',e.code,url,flush=True)
            acq=load_acq(); acq.setdefault('blocked',[]).append({'url':url,'unit_ids':[uid],'http_status':e.code}); json.dump(acq,open(ACQ,'w',encoding='utf-8'),indent=1)
        except Exception as e:
            print(uid,label,'ERR',e,flush=True)
print('total bytes',tot)
