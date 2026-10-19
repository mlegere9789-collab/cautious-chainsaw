import json,numpy as np,os
from geo import *
from scipy.interpolate import RBFInterpolator
F='mapwork/gcps.json'
def load():
    return json.load(open(F)) if os.path.exists(F) else []
def save(g): json.dump(g,open(F,'w'),indent=1)
def add(name,px,py,lon,lat,src='manual'):
    g=load(); g=[x for x in g if x['name']!=name]; g.append(dict(name=name,px=px,py=py,lon=lon,lat=lat,src=src)); save(g)
def fit(smooth=50.0,exclude=None):
    g=[x for x in load() if x['name']!=exclude]
    X=np.array([ll2m(x['lon'],x['lat']) for x in g]); P=np.array([[x['px'],x['py']] for x in g])
    # affine base
    A=np.c_[X,np.ones(len(X))]; ca=np.linalg.lstsq(A,P,rcond=None)[0]
    R=P-A@ca
    rbf=RBFInterpolator(X,R,kernel='thin_plate_spline',smoothing=smooth)
    def f(x,y):
        xy=np.atleast_2d(np.c_[x,y]); base=np.c_[xy,np.ones(len(xy))]@ca
        return base+rbf(xy)
    # inverse via GCP-based fit px->m
    rbf2=None
    Q=np.c_[P,np.ones(len(P))]; cb=np.linalg.lstsq(Q,X,rcond=None)[0]; R2=X-Q@cb
    rbf2=RBFInterpolator(P,R2,kernel='thin_plate_spline',smoothing=smooth)
    def inv(px,py):
        pp=np.atleast_2d(np.c_[px,py]); return np.c_[pp,np.ones(len(pp))]@cb+rbf2(pp)
    return f,inv,g
def loo():
    g=load()
    for x in g:
        f,inv,_=fit(exclude=x['name'])
        m=ll2m(x['lon'],x['lat']); p=f(*m)[0]
        print(x['name'],round(float(p[0]-x['px']),1),round(float(p[1]-x['py']),1))
