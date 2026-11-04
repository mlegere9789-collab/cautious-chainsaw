import sys,os,re,json,hashlib,datetime
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\ny')
from fetch import *
um=json.load(open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\unitmap.json'))
pl=json.load(open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\pagelinks.json'))
acq=load_acq()
have={f['file'] for f in acq['files']}
added=[]
def sha(p):
    h=hashlib.sha256()
    with open(p,'rb') as fh:
        for c in iter(lambda: fh.read(1<<20), b''): h.update(c)
    return h.hexdigest()
for root,_,files in os.walk(CACHE):
    if 'nysmm_pages' in root: continue
    for fn in files:
        rel=os.path.relpath(os.path.join(root,fn),CACHE).replace(chr(92),'/')
        if rel in have or fn in have or fn.endswith('.part'): continue
        p=os.path.join(root,fn)
        ent={'file':rel,'bytes':os.path.getsize(p),'sha256':sha(p),'note':'entry reconstructed from the cached file after a concurrent write to acquired.json lost the original row; sha256 recomputed','retrieved':datetime.datetime.fromtimestamp(os.path.getmtime(p)).isoformat(timespec='seconds')}
        m=re.match(r'nysmm_(.+?)_UnitRoster_(\d+)\.pdf',fn)
        if m:
            slug,num=m.groups()
            for page,links in pl.items():
                if isinstance(links,list) and page.rstrip('/').endswith('/'+slug):
                    for u,l in links:
                        if l.startswith('Unit Roster') and u.rstrip('/').split('/')[-2 if re.search(r'/\d+/\d+$',u) else -1]==num:
                            ent.update(url=u,label=l,unit_page=page,unit_ids=[k for k,v in um.items() if v['page']==page])
        elif fn.startswith('nyag_roh') :
            ent.update(url='https://archive.org/download/newyorkatgettysb0001unse/page/n%s_w1600.jpg'%re.search(r'n(\d+)',fn).group(1),identifier='newyorkatgettysb0001unse')
        acq['files'].append(ent); added.append(rel)
json.dump(acq,open(ACQ,'w',encoding='utf-8'),indent=1)
print(len(added),added[:20])
print(len(acq['files']))
