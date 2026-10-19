import sys,json,numpy as np,warnings; warnings.filterwarnings('ignore'); sys.path.insert(0,'.')
import georef_final as G, cty, cl, importlib
from geo import *
C=cty.load()
def cc(i):
    c=C[i][1].centroid; lo,la=T_INV.transform(c.x,c.y); return lo,la
g=[]
DETD=np.array(json.load(open('mapwork/det2d.json'))); DETD=DETD[(DETD[:,5]>=4.5)&(DETD[:,4]>=12)]
def snap_d(px,r=16):
    d=np.hypot(DETD[:,0]-px[0],DETD[:,1]-px[1]); j=int(d.argmin()); return [float(DETD[j,0]),float(DETD[j,1])] if d[j]<=r else None
cb=importlib.import_module('clusters_b')
skip_clusters={'bryan','spangler_h','hummelbaugh'}   # documented plate/survivor discrepancies
for k,c in cb.C.items():
    if k in skip_clusters: continue
    for s in c['symbols']:
        if s['anchor'] and s['cty'] is not None:
            if s['det'] is not None: px=[float(cl.DET[s['det']][0]),float(cl.DET[s['det']][1])]
            else: px=list(map(float,s['px']))
            sp=snap_d(px)
            if sp is None:
                if s['det'] is None and s.get('detd') is None: sp=px
                else: continue
            px=sp
            lo,la=cc(s['cty']); g.append(dict(name=f"{k}:{s['role']}:{s['cty']}",px=px,lon=lo,lat=la,src=f'county outline {s["cty"]} <-> plate symbol (curated)',kind='curated'))
town=lambda p: 4350<p[0]<5800 and 3300<p[1]<4800
D=np.load('mapwork/icp_S.npy')
seen=[a['px'] for a in g]
for i,jj,d in json.load(open('mapwork/icp_matches.json')):
    lo,la=cc(i); px=[float(D[jj][0]),float(D[jj][1])]
    if town(px): continue
    if any(abs(px[0]-s[0])<6 and abs(px[1]-s[1])<6 for s in seen): continue
    g.append(dict(name=f'icp:cty{i}',px=px,lon=lo,lat=la,src=f'county outline {i} <-> plate symbol (robust ICP, rural only)',kind='icp'))
g+=json.load(open('mapwork/sib_gcps.json'))
def loo(gl,sm):
    e=np.zeros(len(gl))
    for i,a in enumerate(gl):
        m=G.Model([b for j,b in enumerate(gl) if j!=i],sm); p=m.m2px(np.array(ll2m(a['lon'],a['lat'])))[0]; e[i]=np.hypot(*(p-np.array(a['px'])))
    return e
KEEP={'bushman:house:4852','bushman:barn:701','SIB:York Pike bridge over Rock Creek','SIB:Hanover Rd bridge over Rock Creek'}
cur=g; dropped=[]
for it in range(5):
    e=loo(cur,1e4); med=np.median(e)
    bad=[i for i in range(len(cur)) if e[i]>max(3*med,35) and cur[i]['name'] not in KEEP]
    print(it,len(cur),'median',round(med,1),'p90',round(np.percentile(e,90),1),'max',round(e.max(),1),'drop',[(cur[i]['name'],round(e[i])) for i in bad])
    if not bad: break
    dropped+= [(cur[i]['name'],round(float(e[i]),1)) for i in bad]
    cur=[cur[i] for i in range(len(cur)) if i not in bad]
json.dump(cur,open('mapwork/gcps_final4.json','w'),indent=1); json.dump(dropped,open('mapwork/gcps_dropped4.json','w'))
e=loo(cur,1e4); kinds={}
for a,x in zip(cur,e): kinds.setdefault(a['kind'],[]).append(float(x))
for k,v in kinds.items(): print(k,len(v),'median',round(np.median(v),1),'max',round(max(v),1))
print('total',len(cur),'LOO median',round(float(np.median(e)),1),'mean',round(float(e.mean()),1),'p90',round(float(np.percentile(e,90)),1),'max',round(float(e.max()),1))
