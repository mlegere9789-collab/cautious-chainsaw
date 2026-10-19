"""USGS 3DEP 1 m DEM (project PA_South_Central_B1_2017) over the AOI in EPSG:26918, 4096-px blocks via the public exportImage service (cached)."""
import sys, os, json, time, urllib.parse, urllib.request; sys.path.insert(0,'.')
import numpy as np, rasterio, aoi
from rasterio.transform import from_origin
from rasterio.io import MemoryFile
b=aoi.utm_bounds(); res=1.0; B=2000
W=int(b[2]-b[0]); H=int(b[3]-b[1])
base='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage'
UA='gettysburg-map-1863-research/1.0 (read-only, polite, cached; public-domain 3DEP)'
dem=np.full((H,W),np.nan,np.float32)
for r0 in range(0,H,B):
    for c0 in range(0,W,B):
        h=min(B,H-r0); w=min(B,W-c0)
        p=f'dem/blk_{r0}_{c0}.tif'
        if not os.path.exists(p):
            bb=(b[0]+c0, b[3]-(r0+h), b[0]+c0+w, b[3]-r0)
            q=dict(bbox='%f,%f,%f,%f'%bb,bboxSR=26918,imageSR=26918,size=f'{w},{h}',format='tiff',pixelType='F32',interpolation='RSP_BilinearInterpolation',f='image')
            for a in range(4):
                try:
                    time.sleep(2.0); rq=urllib.request.Request(base+'?'+urllib.parse.urlencode(q),headers={'User-Agent':UA})
                    data=urllib.request.urlopen(rq,timeout=300).read()
                    if data[:2] not in (b'II',b'MM'): raise RuntimeError(data[:200])
                    open(p,'wb').write(data); break
                except Exception as e: print('retry',a,e,flush=True); time.sleep(10*(a+1))
        with rasterio.open(p) as ds: a=ds.read(1)
        dem[r0:r0+h,c0:c0+w]=a[:h,:w]; print(r0,c0,float(np.nanmin(a)),float(np.nanmax(a)),flush=True)
with rasterio.open('dem/dem_1m_utm18.tif','w',driver='GTiff',height=H,width=W,count=1,dtype='float32',crs='EPSG:26918',transform=from_origin(b[0],b[3],1,1),compress='deflate',tiled=True,nodata=-9999) as o:
    o.write(np.nan_to_num(dem,nan=-9999),1)
print('done',W,H)
