import sys, os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio, pcnaip
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
from rasterio.transform import from_origin
VINT={'2010':'20100703','2013':'20130604','2015':'20150504','2017':'2017051','2019':'20190927','2022':'2022'}
def scenes(key):
    return [f for f in pcnaip.items() if VINT[key] in f['id']]
def mosaic(key, b, res, bands=(1,2,3,4)):
    """b=(xmin,ymin,xmax,ymax) UTM18N metres; returns uint8 array (n,H,W), valid mask"""
    W=int(round((b[2]-b[0])/res)); H=int(round((b[3]-b[1])/res))
    out=np.zeros((len(bands),H,W),np.uint8); valid=np.zeros((H,W),bool)
    for f in scenes(key):
        with rasterio.Env(GDAL_HTTP_USERAGENT=pcnaip.UA, GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_MAX_RETRY='4', GDAL_HTTP_RETRY_DELAY='3'):
            with rasterio.open(pcnaip.signed(f['assets']['image']['href'])) as ds:
                sb=ds.bounds
                ib=(max(b[0],sb.left),max(b[1],sb.bottom),min(b[2],sb.right),min(b[3],sb.top))
                if ib[0]>=ib[2] or ib[1]>=ib[3]: continue
                # destination pixel window (snapped to output grid)
                c0=int(round((ib[0]-b[0])/res)); c1=int(round((ib[2]-b[0])/res)); r0=int(round((b[3]-ib[3])/res)); r1=int(round((b[3]-ib[1])/res))
                if c1<=c0 or r1<=r0: continue
                wb=(b[0]+c0*res, b[3]-r1*res, b[0]+c1*res, b[3]-r0*res)
                win=from_bounds(*wb, transform=ds.transform)
                a=ds.read(list(bands), window=win, out_shape=(len(bands),r1-r0,c1-c0), resampling=Resampling.average if res>ds.res[0]*1.2 else Resampling.bilinear, boundless=True, fill_value=0)
                m=(a[:3].max(axis=0)>0)
                sub=out[:,r0:r1,c0:c1]; vs=valid[r0:r1,c0:c1]
                put=m & ~vs
                sub[:,put]=a[:,put]; vs|=m
    return out, valid
