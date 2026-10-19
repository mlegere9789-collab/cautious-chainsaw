import json,os,sys,warnings; warnings.filterwarnings('ignore')
sys.path.insert(0,'.')
import numpy as np, cty, gcp
from geo import *
from scipy.optimize import linear_sum_assignment
DET=json.load(open('mapwork/det2.json'))
F='mapwork/clusters.json'
def load(): return json.load(open(F)) if os.path.exists(F) else {}
def save(d): json.dump(d,open(F,'w'),indent=1)
_DA=np.array(DET)
def snap(px,py,r=10):
    d=np.hypot(_DA[:,0]-px,_DA[:,1]-py); i=int(d.argmin())
    return i if d[i]<=r else None
def define(key,label,ids=None,cands=None,sheet='a',extra_px=None,notes='',pts=None):
    ids=list(ids or []); ex=[list(p) for p in (extra_px or [])]
    for (px,py) in (pts or []):
        i=snap(px,py)
        if i is None: ex.append([px,py])
        else: ids.append(i)
    d=load(); d[key]=dict(label=label,ids=ids,cands=cands or [],sheet=sheet,extra_px=ex,notes=notes); save(d)
def solve(key,rng=60,cap=14,verbose=True,smooth=2e3):
    d=load()[key]; f,inv,_=gcp.fit(smooth=smooth)
    S=np.array([[DET[i][0],DET[i][1]] for i in d['ids']]+[list(p) for p in d.get('extra_px',[])])
    if not d['cands']:
        if verbose: print(key,'no survivors candidate'); 
        return None
    C=cty.load(); P=np.array([f(C[i][1].centroid.x,C[i][1].centroid.y)[0] for i in d['cands']])
    # size penalty matrix
    sa=[]
    for i in d['ids']:
        w,h=DET[i][2],DET[i][3]; sa.append((w+6)*(h+6))
    sa+= [60]*len(d.get('extra_px',[]))
    ca=np.array([C[i][1].area for i in d['cands']])
    SZ=np.minimum(3.0*np.abs(np.log2(np.maximum(np.array(sa)[None,:],20)/np.maximum(ca[:,None],20))),9.0)
    best=None
    for dx in range(-rng,rng+1,1):
        for dy in range(-rng,rng+1,1):
            Q=P+[dx,dy]; D=np.linalg.norm(Q[:,None,:]-S[None,:,:],axis=2)
            Dc=np.minimum(D,cap)+SZ
            r,c=linear_sum_assignment(Dc)
            cost=Dc[r,c].sum()+0.01*(abs(dx)+abs(dy))
            if best is None or cost<best[0]: best=(cost,dx,dy,list(zip(r,c)),D)
    cost,dx,dy,pairs,D=best
    out=dict(shift=[dx,dy],cost=float(cost),pairs=[(int(d['cands'][r]),int(c),float(D[r,c])) for r,c in pairs])
    if verbose:
        print(key,'shift',(dx,dy),'cost',round(cost,1))
        for r,c in pairs: print('   cty',d['cands'][r],'-> sym',c,'det',d['ids'][c] if c<len(d['ids']) else 'extra',S[c].round(0).tolist(),'resid',round(D[r,c],1))
    return out
