import sys,math,json,numpy as np
sys.path.insert(0,'.')
X0,Y1=304500,4413500
cls=np.load('scene/cls.npy',mmap_mode='r'); w63=np.load('scene/woods1863.npy',mmap_mode='r'); o63=np.load('scene/open1863.npy',mmap_mode='r'); cov=np.load('scene/cov.npy',mmap_mode='r'); prov=np.load('scene/prov.npy',mmap_mode='r')
can=np.load('C:/Users/mlege/gettysburg-map/tmp/b1863/build/canopy1m.npy',mmap_mode='r')
def cone_stats(E,N,yaw,hfov,r0=8,r1=150):
    R=r1+5
    i0=int(Y1-N-R); i1=int(Y1-N+R); j0=int(E-X0-R); j1=int(E-X0+R)
    c=np.asarray(cls[i0:i1,j0:j1]); p=np.asarray(prov[i0:i1,j0:j1]); cb=np.asarray(can[4416660-Y1+i0:4416660-Y1+i1,X0-299220+j0:X0-299220+j1])
    w=np.asarray(w63[i0:i1,j0:j1]); o=np.asarray(o63[i0:i1,j0:j1]); cv=np.asarray(cov[i0:i1,j0:j1])
    ii,jj=np.mgrid[i0:i1,j0:j1]; yy=Y1-ii-0.5; xx=X0+jj+0.5
    dx=xx-E; dy=yy-N; r=np.hypot(dx,dy); az=np.degrees(np.arctan2(dx,dy))
    d=(az-yaw+180)%360-180
    m=(r>=r0)&(r<=r1)&(np.abs(d)<=hfov/2)
    n=m.sum()
    return dict(n=int(n),canopy_recon=float((c[m]==1).mean()),canopy_2013=float((cb[m]>0).mean()),
                struct=float(np.isin(c[m],[4,5]).mean()),fence=float((c[m]==3).mean()),
                woods1863=float((w[m]>0).mean()),open1863=float((o[m]>0).mean()),covered=float((cv[m]>0).mean()),canopy_kept_photo=float(((c[m]==1)&(p[m]==0)).mean()),canopy_ambig=float(((c[m]==1)&(p[m]==20)).mean()),canopy_outside=float(((c[m]==1)&(p[m]==22)).mean()),canopy_added=float(((c[m]==1)&(p[m]==4)).mean()),
                road_drawn=float((p[m]==6).mean()),removed=float(np.isin(p[m],[1,2,3,5]).mean()))
def ensemble(pose,n=40,pos_sigma=20,yaw_sigma=3,seed=0,**kw):
    E,N,hag,yaw,pitch,hf=pose; rng=np.random.default_rng(seed); out=[]
    for k in range(n):
        out.append(cone_stats(E+rng.normal(0,pos_sigma),N+rng.normal(0,pos_sigma),yaw+rng.normal(0,yaw_sigma),hf,**kw))
    keys=[k for k in out[0] if k!='n']
    return {k:(float(np.median([o[k] for o in out])),float(np.percentile([o[k] for o in out],10)),float(np.percentile([o[k] for o in out],90))) for k in keys}
if __name__=='__main__':
    from cases import CASES
    for c in CASES:
        if c['pose'] is None: continue
        print(c['id'],{k:tuple(round(x,2) for x in v) for k,v in ensemble(c['pose']).items() if k in('canopy_recon','canopy_2013','struct','fence')})
