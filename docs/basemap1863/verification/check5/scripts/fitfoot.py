import sys,math,json; sys.path.insert(0,'.')
import numpy as np, rephoto as R
from scipy.optimize import differential_evolution
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform
_pj=Transformer.from_crs(4326,32618,always_xy=True).transform
_S=None
def footprint(sid):
    global _S
    if _S is None: _S=json.load(open('C:/Users/mlege/gettysburg-map/docs/basemap1863/features/structures/structures.geojson',encoding='utf8'))['features']
    g=[transform(_pj,shape(f['geometry'])) for f in _S if f['properties']['id']==sid and f.get('geometry')][0]
    return np.array(list(g.minimum_rotated_rectangle.exterior.coords)[:4])
def fit(cs,eave,ridge,obs,size,bounds,hag=1.7,seed=1,maxiter=60,pop=25):
    """obs: dict u_l,u_r,v_base,v_top (photo px). bounds: E,N,yaw,pitch,hfov"""
    pw,ph=size
    g=[R.ground(x,y) for x,y in cs]
    # roof ridge: midpoints of the two short edges raised to ridge height; eave corners
    L=[np.hypot(*(cs[(i+1)%4]-cs[i])) for i in range(4)]
    def cost(x):
        E,N,yaw,pitch,hfov=x
        Zc=R.ground(E,N)+hag
        base=[(cs[i][0],cs[i][1],g[i]) for i in range(4)]
        eav=[(cs[i][0],cs[i][1],g[i]+eave) for i in range(4)]
        # ridge ends: mid of short edges
        sh=sorted(range(4),key=lambda i:L[i])[:2]
        rid=[((cs[i][0]+cs[(i+1)%4][0])/2,(cs[i][1]+cs[(i+1)%4][1])/2,(g[i]+g[(i+1)%4])/2+ridge) for i in sh]
        pts=base+eav+rid
        uv,zc=R.project(pts,E,N,Zc,yaw,pitch,0,hfov,pw,ph)
        if (zc<=1).any(): return 1e6
        ul=uv[:,0].min(); ur=uv[:,0].max(); vb=uv[:4,1].mean(); vt=uv[8:,1].mean()
        return math.sqrt(((ul-obs['u_l'])**2+(ur-obs['u_r'])**2+(vb-obs['v_base'])**2+(vt-obs['v_top'])**2)/4)
    b=[bounds[k] for k in ('E','N','yaw','pitch','hfov')]
    res=differential_evolution(cost,b,seed=seed,maxiter=maxiter,popsize=pop,tol=1e-4,polish=True)
    return res.x,res.fun
