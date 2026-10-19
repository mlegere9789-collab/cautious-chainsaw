# Builds UTM-18N 1 m scene rasters for the rephotography renderer (check pass 5).
# Inputs are the committed tiles (reconstruction), the scratch NAIP/3DEP rasters, and the committed feature catalogues.
import os, json, math, numpy as np, cv2, rasterio
from rasterio.windows import from_bounds
from rasterio import features
from rasterio.transform import from_origin
from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform as stransform
cv2.setNumThreads(4)
R='C:/Users/mlege/gettysburg-map/'
OUT=R+'tmp/b1863/check5/scene/'
X0,X1,Y0,Y1=304500,311500,4405500,4413500   # UTM18N window, 1 m
W,H=X1-X0,Y1-Y0
tf=from_origin(X0,Y1,1,1)
# DEM
with rasterio.open(R+'tmp/b1863/maps/ref/dem_1m.tif') as r:
    win=from_bounds(X0,Y0,X1,Y1,r.transform)
    dem=r.read(1,window=win,boundless=True,fill_value=np.nan).astype('float32')
print('dem',dem.shape,np.nanmin(dem),np.nanmax(dem),np.isnan(dem).mean())
np.save(OUT+'dem.npy',dem)
with rasterio.open(R+'tmp/b1863/maps/ref/naip_1m.tif') as r:
    win=from_bounds(X0,Y0,X1,Y1,r.transform)
    naip=np.moveaxis(r.read(window=win,boundless=True,fill_value=0),0,-1)
print('naip',naip.shape); np.save(OUT+'naip.npy',naip)
# recon mosaic
Z=16
man=json.load(open(R+'docs/basemap1863/tiles/manifest.json'))
def merc_px(lon,lat,z):
    n=512*2**z
    x=(lon+180)/360*n
    y=(0.5-math.log(math.tan(math.pi/4+math.radians(lat)/2))/(2*math.pi))*n
    return x,y
inv=Transformer.from_crs(32618,4326,always_xy=True)
# coarse grid every 50 m then upsample
gx=np.arange(X0,X1+50,50.0); gy=np.arange(Y1,Y0-50,-50.0)
GX,GY=np.meshgrid(gx,gy)
lon,lat=inv.transform(GX,GY)
def build(z):
    n=512*2**z
    px=(lon+180)/360*n
    py=(0.5-np.log(np.tan(np.pi/4+np.radians(lat)/2))/(2*np.pi))*n
    return px,py
for z,name in ((16,'recon16'),):
    px,py=build(z)
    tx0,tx1=int(px.min()//512),int(px.max()//512); ty0,ty1=int(py.min()//512),int(py.max()//512)
    print('tiles',tx0,tx1,ty0,ty1)
    mos=np.zeros(((ty1-ty0+1)*512,(tx1-tx0+1)*512,4),np.uint8)
    missing=0
    for ty in range(ty0,ty1+1):
        for tx in range(tx0,tx1+1):
            f=R+f'docs/basemap1863/tiles/{z}/{tx}/{ty}.webp'
            if os.path.exists(f):
                a=cv2.imread(f,cv2.IMREAD_UNCHANGED)
                if a is None: missing+=1;continue
                if a.shape[2]==3: a=np.dstack([a,np.full(a.shape[:2],255,np.uint8)])
                mos[(ty-ty0)*512:(ty-ty0+1)*512,(tx-tx0)*512:(tx-tx0+1)*512]=a
            else: missing+=1
    print('missing z16 tiles',missing)
    mx=cv2.resize((px-tx0*512).astype('float32'),(W+50,H+50),interpolation=cv2.INTER_CUBIC)[:H,:W]
    my=cv2.resize((py-ty0*512).astype('float32'),(W+50,H+50),interpolation=cv2.INTER_CUBIC)[:H,:W]
    # the coarse grid is 50 m: upsample factor 50 with grid sample positions at centers; fix offset via linear interpolation
    gxs=np.arange(W)/50.0; gys=np.arange(H)/50.0
    mxx,myy=np.meshgrid(gxs,gys)
    mx=cv2.remap((px-tx0*512).astype('float32'),mxx.astype('float32'),myy.astype('float32'),cv2.INTER_LINEAR)
    my=cv2.remap((py-ty0*512).astype('float32'),mxx.astype('float32'),myy.astype('float32'),cv2.INTER_LINEAR)
    # pixel centres: UTM pixel (i,j) centre is at (X0+j+.5, Y1-i-.5); coarse grid node k at X0+50k -> shift by .5/50
    mx=cv2.remap((px-tx0*512).astype('float32'),(mxx+0.5/50).astype('float32'),(myy+0.5/50).astype('float32'),cv2.INTER_LINEAR)
    my=cv2.remap((py-ty0*512).astype('float32'),(mxx+0.5/50).astype('float32'),(myy+0.5/50).astype('float32'),cv2.INTER_LINEAR)
    out=cv2.remap(mos,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0)
    del mos
    print('alpha0 frac',(out[...,3]==0).mean())
    np.save(OUT+'recon.npy',out)  # BGRA
