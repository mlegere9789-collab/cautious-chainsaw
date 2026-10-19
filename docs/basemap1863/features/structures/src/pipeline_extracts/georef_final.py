import sys,json,numpy as np,warnings; warnings.filterwarnings('ignore')
sys.path.insert(0,'.')
from geo import *
import cty,gcp
from scipy.interpolate import RBFInterpolator
C=cty.load()
D=np.load('mapwork/icp_S.npy')
def build_gcps():
    g=[]
    for x in gcp.load():
        g.append(dict(name=x['name'],px=[x['px'],x['py']],lon=x['lon'],lat=x['lat'],src=x['src'],kind='curated'))
    seen={(round(a['px'][0]),round(a['px'][1])) for a in g}
    for i,jj,d in json.load(open('mapwork/icp_matches.json')):
        c=C[i][1].centroid; lo,la=T_INV.transform(c.x,c.y)
        px=[float(D[jj][0]),float(D[jj][1])]
        if any(abs(px[0]-s[0])<6 and abs(px[1]-s[1])<6 for s in seen): continue
        g.append(dict(name=f'icp:cty{i}',px=px,lon=lo,lat=la,src=f'county outline {i} <-> Warren-plate symbol (robust ICP)',kind='icp'))
    return g
class Model:
    def __init__(self,g,smooth):
        self.g=g; X=np.array([ll2m(a['lon'],a['lat']) for a in g]); P=np.array([a['px'] for a in g])
        self.X0=X.mean(0)
        Aff=np.c_[X-self.X0,np.ones(len(X))]; self.ca=np.linalg.lstsq(Aff,P,rcond=None)[0]
        self.rbf=RBFInterpolator(X,P-Aff@self.ca,kernel='thin_plate_spline',smoothing=smooth)
        Q=np.c_[P,np.ones(len(P))]; self.P0=P.mean(0)
        Q=np.c_[P-self.P0,np.ones(len(P))]; self.cb=np.linalg.lstsq(Q,X,rcond=None)[0]
        self.rbf2=RBFInterpolator(P,X-Q@self.cb,kernel='thin_plate_spline',smoothing=smooth)
    def m2px(self,X):
        X=np.atleast_2d(X); return np.c_[X-self.X0,np.ones(len(X))]@self.ca+self.rbf(X)
    def px2m_approx(self,P):
        P=np.atleast_2d(P); return np.c_[P-self.P0,np.ones(len(P))]@self.cb+self.rbf2(P)
    def px2m(self,P):
        # exact inverse of m2px by Newton iteration (so that px -> ground -> px round-trips)
        P=np.atleast_2d(np.asarray(P,float)); X=self.px2m_approx(P)
        for _ in range(6):
            F=self.m2px(X)-P
            if np.abs(F).max()<0.01: break
            h=1.0
            Jx=(self.m2px(X+[h,0])-self.m2px(X-[h,0]))/(2*h); Jy=(self.m2px(X+[0,h])-self.m2px(X-[0,h]))/(2*h)
            det=Jx[:,0]*Jy[:,1]-Jx[:,1]*Jy[:,0]
            dx=( Jy[:,1]*F[:,0]-Jy[:,0]*F[:,1])/det; dy=(-Jx[:,1]*F[:,0]+Jx[:,0]*F[:,1])/det
            X=X-np.c_[dx,dy]
        return X
def cv(g,smooth,k=10,seed=1):
    rng=np.random.default_rng(seed); idx=rng.permutation(len(g)); folds=np.array_split(idx,k); errs=[]
    for f in folds:
        tr=[g[i] for i in range(len(g)) if i not in set(f)]
        m=Model(tr,smooth)
        for i in f:
            X=np.array(ll2m(g[i]['lon'],g[i]['lat'])); p=m.m2px(X)[0]
            errs.append(float(np.hypot(*(p-np.array(g[i]['px'])))))
    return np.array(errs)
if __name__=='__main__':
    g=build_gcps(); print(len(g))
    for s in (1e2,1e3,3e3,1e4,3e4,1e5,1e6):
        e=cv(g,s); print(s,'median',round(np.median(e),2),'mean',round(e.mean(),2),'p90',round(np.percentile(e,90),2),'max',round(e.max(),1))
