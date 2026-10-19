import sys,json,numpy as np,warnings; warnings.filterwarnings('ignore')
sys.path.insert(0,'.')
from geo import *
import cty
from scipy.spatial import cKDTree
from scipy.interpolate import RBFInterpolator
D=np.array(json.load(open('mapwork/sym_d.json'))); A=np.array(json.load(open('mapwork/sym_a.json')))
ta=cKDTree(A[:,:2]); dd,ii=ta.query(D[:,:2])
m=(dd<4)&(D[:,5]<0.22)&(D[:,4]>=30)&(D[:,4]<=450)
S=D[m]
# drop dense neighbourhoods (woods)
tree=cKDTree(S[:,:2]); cnt=np.array([len(tree.query_ball_point(p,45)) for p in S[:,:2]])
S=S[cnt<=7]; print('symbols',len(S)); np.save('mapwork/icp_S.npy',S)
C=cty.load(); cent=np.array([[g.centroid.x,g.centroid.y,g.area] for i,g,p in C])
inb=(cent[:,2]>=20)
# restrict county buildings to battlefield bbox in lon/lat
lonlat=np.array([T_INV.transform(x,y) for x,y in cent[:,:2]])
bb=(lonlat[:,0]>-77.29)&(lonlat[:,0]<-77.18)&(lonlat[:,1]>39.77)&(lonlat[:,1]<39.85)
use=np.where(inb&bb)[0]
X=cent[use,:2]; AR=cent[use,2]
# initial: TPS from rebuilt gcps
import gcp
f,inv,_=gcp.fit(smooth=2e3)
P=f(X[:,0],X[:,1])
st=cKDTree(S[:,:2])
def match(P,thr):
    d,j=st.query(P)
    # mutual best
    tj=cKDTree(P); d2,i2=tj.query(S[:,:2])
    ok=[]
    for a,(dist,jj) in enumerate(zip(d,j)):
        if dist<thr and i2[jj]==a:
            sa=(S[jj,2]+5)*(S[jj,3]+5)*0.8 # symbol area px ~ m2
            # area plausibility: symbol area vs building area (ratio within factor 6)
            r=sa/max(AR[a],10)
            if 1/6<r<6: ok.append((a,jj,dist))
    return ok
thr=14
for it in range(5):
    ok=match(P,thr)
    print('iter',it,'thr',thr,'matches',len(ok),'median resid',np.median([o[2] for o in ok]))
    Xm=np.array([X[a] for a,jj,d in ok]); Pm=np.array([S[jj,:2] for a,jj,d in ok])
    # fit TPS (affine+rbf) on matches
    Aff=np.c_[Xm,np.ones(len(Xm))]; ca=np.linalg.lstsq(Aff,Pm,rcond=None)[0]; R=Pm-Aff@ca
    rbf=RBFInterpolator(Xm,R,kernel='thin_plate_spline',smoothing=3e3*(1+0)) 
    P=np.c_[X,np.ones(len(X))]@ca+rbf(X)
    thr=[10,8,7,6,6][it]
ok=match(P,6)
print('final matches',len(ok))
json.dump([(int(use[a]),int(jj),float(d)) for a,jj,d in ok],open('mapwork/icp_matches.json','w'))
# LOO error estimate
errs=[]
Xm=np.array([X[a] for a,jj,d in ok]); Pm=np.array([S[jj,:2] for a,jj,d in ok])
rng=np.random.default_rng(0); idx=rng.permutation(len(ok))[:150]
for k in idx:
    msk=np.ones(len(ok),bool); msk[k]=False
    Aff=np.c_[Xm[msk],np.ones(msk.sum())]; ca=np.linalg.lstsq(Aff,Pm[msk],rcond=None)[0]; R=Pm[msk]-Aff@ca
    rb=RBFInterpolator(Xm[msk],R,kernel='thin_plate_spline',smoothing=3e3)
    p=np.r_[Xm[k],1]@ca+rb(Xm[k][None])[0]
    errs.append(np.hypot(*(p-Pm[k])))
print('LOO px error : median',np.median(errs),'p90',np.percentile(errs,90))
