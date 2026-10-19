import sys, numpy as np, json
sys.path.insert(0,'scripts')
import tiger_ix
from scipy import ndimage as ndi
from scipy.optimize import minimize
ink=np.load('seg_ink.npy')   # half-res
dt=np.minimum(ndi.distance_transform_edt(1-ink),15).astype(np.float32)
keep=['Baltimore Pike','Taneytown Rd','Emmitsburg Rd','Hanover Rd','York Rd','Chambersburg Rd','Mummasburg Rd','Fairfield Rd','Table Rock Rd']
pts=[]
for nm in keep:
    g=tiger_ix.U.get(nm)
    for ln in getattr(g,'geoms',[g]):
        if ln.geom_type!='LineString': continue
        n=max(2,int(ln.length/2e-4))
        for t in np.linspace(0,1,n):
            p=ln.interpolate(t,normalized=True); x,y=tiger_ix.T.transform(p.x,p.y); pts.append((x,y))
pts=np.array(pts); print(len(pts))
A0=(5303.0,3868.0)
def tf(p,E,N):
    tx,ty,s,th=p[:4]; dE=E-tx; dN=N-ty; c,si=np.cos(th),np.sin(th)
    x=(c*dE+si*dN)/s; y=(-si*dE+c*dN)/s
    return x+A0[0], A0[1]-y
def cost(p):
    px,py=tf(p,pts[:,0],pts[:,1]); px=px*0.5; py=py*0.5
    ok=(px>1)&(px<dt.shape[1]-2)&(py>1)&(py<dt.shape[0]-2)
    if ok.sum()<0.25*len(px): return 99
    v=ndi.map_coordinates(dt,[py[ok],px[ok]],order=1)
    return float(v.mean())
if __name__=='__main__':
    res=[]
    for th in np.deg2rad(np.arange(-3.5,-1.5,0.25)):
      for s in np.arange(0.90,1.13,0.01):
        bb=None
        for dx in range(-300,301,30):
          for dy in range(-300,301,30):
            p=np.array([309076.0+dx,4411356.0+dy,s,th]); c=cost(p)
            if bb is None or c<bb[0]: bb=(c,p)
        res.append(bb)
    res.sort(key=lambda t:t[0])
    for c,p in res[:6]: print(round(c,3),p[:3].round(2),round(float(np.rad2deg(p[3])),2))
    c,p=res[0]
    r=minimize(cost,p,method='Nelder-Mead',options={'xatol':0.01,'fatol':1e-5,'maxiter':3000})
    print(r.fun,r.x,np.rad2deg(r.x[3]))
    json.dump({'p':r.x.tolist(),'A0':A0,'cost':r.fun},open('chamfer_fit.json','w'))
