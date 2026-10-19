# Camera pose fit from mixed constraints: skyline (DEM+ext), point and polyline correspondences.
import sys,math,json; sys.path.insert(0,'.')
import numpy as np, rephoto as R
from scipy.optimize import differential_evolution
from pyproj import Transformer
from shapely.geometry import shape, LineString, MultiLineString
from shapely.ops import transform
_pj=Transformer.from_crs(4326,32618,always_xy=True).transform
FE='C:/Users/mlege/gettysburg-map/docs/basemap1863/features/'
def road_pts(rid,step=4.0,file='roads-rail-water/roads.geojson'):
    d=json.load(open(FE+file,encoding='utf8'))
    for f in d['features']:
        if f['properties']['id']==rid:
            g=transform(_pj,shape(f['geometry']))
            geoms=list(g.geoms) if g.geom_type.startswith('Multi') else [g]
            out=[]
            for ln in geoms:
                n=max(2,int(ln.length/step))
                out+= [ln.interpolate(i/n,normalized=True).coords[0] for i in range(n+1)]
            return np.array(out)
    raise KeyError(rid)
class Fit:
    def __init__(s,size,W=160):
        s.pw,s.ph=size; s.W=W; s.H=int(round(W*s.ph/s.pw)); s.pts=[]; s.lines=[]; s.sky=None; s.wsky=1.0
    def add_pt(s,uv,en,hgt=None,w=1.0):  # en=(E,N) ; hgt None -> ground
        s.pts.append((uv,en,hgt,w))
    def add_line(s,uvs,poly,w=1.0):
        poly=np.asarray(poly); poly=poly[(poly[:,0]>304510)&(poly[:,0]<311490)&(poly[:,1]>4405510)&(poly[:,1]<4413490)]; gz=np.array([R.ground(x_,y_) for x_,y_ in poly]); s.lines.append((np.array(uvs,float),np.c_[poly,gz],w))
    def set_sky(s,prof,w=1.0):
        pf=np.array(prof,float); s.sky=pf; s.wsky=w
        us=pf[:,0]/s.pw*s.W; vs=pf[:,1]/s.ph*s.H
        s.cols=np.arange(int(math.ceil(us.min())),int(us.max())+1); s.tv=np.interp(s.cols,us,vs)
    def cost(s,x,detail=False):
        E,N,hag,yaw,pitch,hfov=x[:6]
        roll=x[6] if len(x)>6 else 0.0
        Zc=R.ground(E,N)+hag
        res=[]
        det={}
        for uv,en,hgt,w in s.pts:
            z=R.ground(*en)+(hgt or 0.0)
            p,zc=R.project([(en[0],en[1],z)],E,N,Zc,yaw,pitch,roll,hfov,s.pw,s.ph)
            if zc[0]<=1: res.append(400*w); continue
            res.append(w*math.hypot(*(p[0]-np.array(uv))))
        det['pts']=list(res)
        for uvs,poly,w in s.lines:
            d=np.hypot(poly[:,0]-E,poly[:,1]-N); m=d<1500
            P3=poly[m]
            if len(P3)<2: res+= [400*w]*len(uvs); continue
            p,zc=R.project(P3,E,N,Zc,yaw,pitch,roll,hfov,s.pw,s.ph)
            ok=zc>1
            if ok.sum()<2: res+= [400*w]*len(uvs); continue
            q=p[ok]
            # densify between consecutive projected pts
            segs=[]
            for i in range(len(q)-1):
                a,b=q[i],q[i+1]; n=max(1,int(np.hypot(*(b-a))/2)); n=min(n,400)
                segs.append(a+(b-a)*(np.arange(n+1)[:,None]/n))
            Q=np.vstack(segs) if segs else q
            for uv in uvs:
                dd=np.hypot(Q[:,0]-uv[0],Q[:,1]-uv[1]).min(); res.append(w*min(dd,400))
        if s.sky is not None:
            r=_skyrows(E,N,hag,yaw,pitch,hfov,s.W,s.H,roll)
            e=np.clip((r[s.cols]-s.tv)/s.H*s.ph,-300,300)*s.wsky
            res+=list(e[::4])
        res=np.array(res)
        c=float(np.sqrt(np.mean(res**2)))
        if detail: return c,det
        return c
    def solve(s,bounds,seed=1,maxiter=60,pop=20):
        b=[bounds[k] for k in ('E','N','hag','yaw','pitch','hfov')]
        r=differential_evolution(s.cost,b,seed=seed,maxiter=maxiter,popsize=pop,tol=1e-4,polish=False,updating='immediate')
        return r.x,r.fun
def _skyrows(E,N,hag,yaw,pitch,hfov,W,H,roll=0.0):
    img,d,cl=R.render(E,N,1.0,yaw,pitch,hfov,W=W,H=H,roll=roll,tmax=6000,clear_r=20.0,Z=R.ground(E,N)+hag)
    hit=d>=0
    return np.where(hit.any(0),hit.argmax(0),H).astype(float)
