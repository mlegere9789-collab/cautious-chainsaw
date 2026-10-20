import json, numpy as np, rasterio
from rasterio import features
from rasterio.transform import from_origin
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform as stf
R='C:/Users/mlege/gettysburg-map/docs/basemap1863/features/'
X0,X1,Y0,Y1=304500,311500,4405500,4413500
tf=from_origin(X0,Y1,1,1); shp=(Y1-Y0,X1-X0)
pj=Transformer.from_crs(4326,32618,always_xy=True).transform
def load(f):
    d=json.load(open(R+f,encoding='utf8'))
    return [(ft['properties'],stf(pj,shape(ft['geometry']))) for ft in d['features'] if ft.get('geometry')]
ext=np.zeros(shp,np.float32)   # height above ground (m)
cls=np.zeros(shp,np.uint8)     # 1 woods 2 orchard 3 fence 4 structure
def burn(items,h,c,all_touched=False):
    sh=[(g,1) for g in items if not g.is_empty]
    m=features.rasterize(sh,out_shape=shp,transform=tf,all_touched=all_touched,dtype='uint8')>0
    ext[m]=h if np.isscalar(h) else 0; cls[m]=c; return m
w=load('landcover/woods_1863.geojson'); burn([g for p,g in w],18.0,1)
o=load('landcover/orchards_1863.geojson'); burn([g for p,g in o],0.0,2)
f=load('roads-rail-water/fences.geojson')
fl=[g.buffer(0.6) for p,g in f if p.get('draw') in (True,'True')]
print('fences drawn',len(fl),'of',len(f)); burn(fl,1.4,3,True)
eave={'farmhouse':6,'barn':7,'bank_barn':7.5,'building':5,'borough_building_mass':6.5,'institutional':9,'house':5.5,'outbuilding':3,'farmstead':5,'smokehouse':2.5,'stable':4,'log_building':3.5,'church':9,'courthouse':10,'railroad_station':5,'college_building':11,'seminary_building':11,'gatehouse':7,'tavern':7,'school':5.5,'covered_bridge':4,'mill':8,'wagon_shed':4}
import math
s_=load('structures/structures.geojson')
Y=np.arange(shp[0])[:,None]; Xc=np.arange(shp[1])[None,:]
for p,g in s_:
    sub=p.get('subtype'); e0=eave.get(sub,5.5)
    if g.geom_type=='Point': g=g.buffer(4,cap_style=3)
    m=features.rasterize([(g,1)],out_shape=shp,transform=tf,all_touched=True,dtype='uint8')>0
    if not m.any(): continue
    mr=g.minimum_rotated_rectangle
    if mr.geom_type!='Polygon': ext[m]=e0; cls[m]=4; continue
    xs=list(mr.exterior.coords)[:4]
    e1=(xs[1][0]-xs[0][0],xs[1][1]-xs[0][1]); e2=(xs[2][0]-xs[1][0],xs[2][1]-xs[1][1])
    L1=math.hypot(*e1); L2=math.hypot(*e2)
    ax=e1 if L1>=L2 else e2; Lax=max(L1,L2); Wd=min(L1,L2)
    ux,uy=ax[0]/Lax,ax[1]/Lax   # unit long axis (E,N)
    ii,jj=np.nonzero(m)
    xx=X0+jj+0.5; yy=Y1-ii-0.5
    perp=np.abs((xx-mr.centroid.x)*(-uy)+(yy-mr.centroid.y)*ux)
    rise=min(math.tan(math.radians(30))*Wd/2, 6.0)
    h=e0+rise*(1-np.clip(perp/(Wd/2+0.5),0,1))
    ext[ii,jj]=h; cls[ii,jj]=4
print('ext cells',(ext>0).sum(), {c:int((cls==c).sum()) for c in (1,2,3,4)})
np.save('scene/ext.npy',ext); np.save('scene/cls.npy',cls)
