import numpy as np, sys, json, cv2
from scipy import ndimage as ndi
sys.path.insert(0,'scripts')
import warp
d=np.load('chm_final.npz'); gnd=d['gnd']; R=2.0; X0,Y1=303000.0,4416200.0
ind=np.load('warren_inkdens.npy').astype(np.float32)
g=ndi.gaussian_filter(gnd,2.0)
gy,gx=np.gradient(g,R); slope=np.hypot(gx,gy)
slope=ndi.gaussian_filter(slope,6.0)       # ~ 12 m sigma
# resample both to 10 m grid
S=10.0
E=np.arange(X0+S/2,X0+11500,S); N=np.arange(Y1-S/2,Y1-12000,-S)
EE,NN=np.meshgrid(E,N)
sl=ndi.map_coordinates(slope,[(Y1-NN)/R-0.5,(EE-X0)/R-0.5],order=1)
def warren_at(dE=0.0,dN=0.0,use_ffd=True):
    px,py=warp.utm_to_px(EE+dE,NN+dN,use_ffd=use_ffd)
    return ndi.map_coordinates(ind,[py,px],order=1,mode='constant',cval=np.nan)
def ncc(a,b):
    m=np.isfinite(a)&np.isfinite(b)
    if m.sum()<500: return np.nan
    a=a[m]-a[m].mean(); b=b[m]-b[m].mean(); return float((a*b).sum()/(np.sqrt((a*a).sum()*(b*b).sum())+1e-9))
if __name__=='__main__':
    use_ffd = (len(sys.argv)>1 and sys.argv[1]=='ffd')
    # global scan: shift the Warren sampling by (dE,dN) meters
    best=None; res={}
    for dE in range(-90,91,15):
        for dN in range(-90,91,15):
            a=warren_at(dE,dN,use_ffd); c=ncc(a,sl); res[(dE,dN)]=c
            if np.isfinite(c) and (best is None or c>best[0]): best=(c,dE,dN)
    print('ffd',use_ffd,'zero-shift NCC',round(res[(0,0)],3),'best',best)
    json.dump({f'{k[0]},{k[1]}':v for k,v in res.items()},open(f'slopereg_global_{int(use_ffd)}.json','w'))
