# Extrusion layer built from what the reconstruction ACTUALLY draws/keeps: canopy kept or added (provenance raster),
# drawn structures/masses (draw_items.pkl, builder's own footprint rule), drawn fences. Heights are assumptions (see report).
import sys,pickle,math,numpy as np,cv2
from rasterio import features
from rasterio.transform import from_origin
sys.path.insert(0,'C:/Users/mlege/gettysburg-map/tools/b1863')
import warnings; warnings.filterwarnings('ignore')
import features as BF
B='C:/Users/mlege/gettysburg-map/tmp/b1863/build/'
X0,Y1,W,H=304500,4413500,7000,8000
r0=4416660-Y1; c0=X0-299220
prov=np.fromfile(B+'prov.u8',np.uint8).reshape(13620,17280)[r0:r0+H,c0:c0+W]
can=np.load(B+'canopy1m.npy',mmap_mode='r')[r0:r0+H,c0:c0+W]
kept=(can>0)&~np.isin(prov,[1,2,3,5,6,7,8,9,10,11,12,13])
canopy=kept|(prov==4)
print('canopy frac',canopy.mean(),'kept',kept.mean(),'added',(prov==4).mean())
dt=cv2.distanceTransform(canopy.astype(np.uint8),cv2.DIST_L2,3)
rng=np.random.default_rng(7); n=cv2.GaussianBlur(rng.standard_normal(canopy.shape).astype('float32'),(0,0),2.5); n/=n.std()
h=np.clip(4+1.5*dt,4,19)*np.clip(1+0.15*n,0.7,1.3)
ext=np.where(canopy,h,0).astype('float32'); cls=np.where(canopy,1,0).astype('uint8')
tf=from_origin(X0,Y1,1,1); shp=(H,W)
d=pickle.load(open(B+'draw_items.pkl','rb'))
fl=[g for g in (it['geom'].buffer(0.6) for it in d['fences'])]
m=features.rasterize([(g,1) for g in fl],out_shape=shp,transform=tf,all_touched=True,dtype='uint8')>0
ext[m]=1.4; cls[m]=3
HEIGHT=BF.HEIGHT
def burn(poly,hh,code,sub=None):
    m=features.rasterize([(poly,1)],out_shape=shp,transform=tf,all_touched=True,dtype='uint8')>0
    if not m.any(): return
    mr=poly.minimum_rotated_rectangle
    if mr.geom_type!='Polygon': ext[m]=hh; cls[m]=code; return
    xs=list(mr.exterior.coords)[:4]
    e1=(xs[1][0]-xs[0][0],xs[1][1]-xs[0][1]); e2=(xs[2][0]-xs[1][0],xs[2][1]-xs[1][1])
    L1=math.hypot(*e1); L2=math.hypot(*e2); ax=e1 if L1>=L2 else e2; Lax=max(L1,L2); Wd=min(L1,L2)
    ux,uy=ax[0]/Lax,ax[1]/Lax
    ii,jj=np.nonzero(m); xx=X0+jj+0.5; yy=Y1-ii-0.5
    perp=np.abs((xx-mr.centroid.x)*(-uy)+(yy-mr.centroid.y)*ux)
    eave=0.62*hh; rise=hh-eave
    ext[ii,jj]=eave+rise*(1-np.clip(perp/(Wd/2+0.5),0,1)); cls[ii,jj]=code
roads=d['roads']; nstr=0
for it in d['structures']:
    g=it['geom']
    try:
        fp=BF._footprint(it,roads) if g.geom_type!='Polygon' else g
    except Exception as e:
        print('fp fail',it['id'],e); continue
    if g.geom_type!='Polygon' and it.get('src')=='hopkins': pass
    minx,miny,maxx,maxy=fp.bounds
    if maxx<X0 or minx>X0+W or maxy<Y1-H or miny>Y1: continue
    burn(fp,HEIGHT.get(it['sub'],6.0),4); nstr+=1
for it in d['masses']:
    g=it['geom']
    if g.bounds[2]<X0 or g.bounds[0]>X0+W or g.bounds[3]<Y1-H or g.bounds[1]>Y1: continue
    burn(g,8.0,5); nstr+=1
print('structures/masses burned',nstr)
np.save('scene/ext.npy',ext); np.save('scene/cls.npy',cls); np.save('scene/prov.npy',prov)
print({k:int((cls==k).sum()) for k in (1,3,4,5)})
