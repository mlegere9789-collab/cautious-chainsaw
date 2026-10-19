import numpy as np, sys, json
sys.path.insert(0,'scripts')
from slopereg2 import *
res=[]
W=300  # 3 km windows at 10 m
ny,nx=EE.shape
for y in range(0,ny-W+1,150):
    for x in range(0,nx-W+1,150):
        sub=(slice(y,y+W),slice(x,x+W))
        E_=EE[sub]; N_=NN[sub]; s=sl[sub]
        best=None; c0=None
        for dE in range(-60,61,10):
            for dN in range(-60,61,10):
                px,py=warp.utm_to_px(E_+dE,N_+dN,True)
                a=ndi.map_coordinates(ind,[py,px],order=1,mode='constant',cval=np.nan)
                c=ncc(a,s)
                if dE==0 and dN==0: c0=c
                if np.isfinite(c) and (best is None or c>best[0]): best=(c,dE,dN)
        if best: res.append({'E':float(E_.mean()),'N':float(N_.mean()),'ncc0':c0,'best':best[0],'dE':best[1],'dN':best[2]})
        print(res[-1] if best else None,flush=True)
json.dump(res,open('slopereg_local.json','w'))
