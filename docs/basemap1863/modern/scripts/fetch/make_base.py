import sys, time; sys.path.insert(0,'.')
import numpy as np, rasterio, mosaic, aoi
from rasterio.transform import from_origin
key=sys.argv[1]; res=float(sys.argv[2])
b=aoi.utm_bounds(); t=time.time()
a,v=mosaic.mosaic(key,b,res)
with rasterio.open(f'work/naip{key}_{res}m.tif','w',driver='GTiff',height=a.shape[1],width=a.shape[2],count=4,dtype='uint8',crs='EPSG:26918',transform=from_origin(b[0],b[3],res,res),compress='deflate',predictor=2,tiled=True,blockxsize=512,blockysize=512,photometric='RGB',extrasamples=[1]) as o:
    o.write(a)
np.save(f'work/naip{key}_{res}m_valid.npy',v)
print(key,res,a.shape,'valid',float(v.mean()),round(time.time()-t),'s')
