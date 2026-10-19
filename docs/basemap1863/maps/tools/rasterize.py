"""Warp a scan into UTM 18N on a 1 m grid (AOI of common.py) with its affine en_to_px; write tiled-deflate RGB GeoTIFF + alpha band (footprint) to tmp/b1863/maps/georef/.
python rasterize.py <map_id> [step_m=1.0]"""
import sys, os, json, numpy as np, cv2, rasterio
from rasterio.transform import from_origin
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
cv2.setNumThreads(3)
from common import *
mid = sys.argv[1]; step = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
T = json.load(open(os.path.join(OUT, 'transforms', mid + '.json')))
Ai = np.array(T['en_to_px']['A']); ti = np.array(T['en_to_px']['t'])
W = int((AOI['e1'] - AOI['e0']) / step); H = int((AOI['n1'] - AOI['n0']) / step)
scan = np.array(Image.open(os.path.join(TMP, 'scans', T['scan'])).convert('RGB'))
# dst (col,row) -> EN = (e0 + col*step, n1 - row*step) -> src px = Ai @ EN + ti
M = np.zeros((2, 3)); M[:, 0] = Ai[:, 0] * step; M[:, 1] = -Ai[:, 1] * step; M[:, 2] = Ai @ np.array([AOI['e0'], AOI['n1']]) + ti
flag = cv2.INTER_AREA if step > 1.2 else cv2.INTER_LINEAR
out = cv2.warpAffine(scan, M, (W, H), flags=flag | cv2.WARP_INVERSE_MAP, borderValue=(0, 0, 0))
mask = cv2.warpAffine(np.full(scan.shape[:2], 255, np.uint8), M, (W, H), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP, borderValue=0)
os.makedirs(os.path.join(TMP, 'georef'), exist_ok=True)
p = os.path.join(TMP, 'georef', mid + '.tif')
with rasterio.open(p, 'w', driver='GTiff', width=W, height=H, count=4, dtype='uint8', crs=CRS, transform=from_origin(AOI['e0'], AOI['n1'], step, step), compress='deflate', tiled=True, photometric='RGB', alpha='YES') as ds:
    ds.write(out.transpose(2, 0, 1), indexes=[1, 2, 3]); ds.write(mask, 4)
print(mid, p, W, H, os.path.getsize(p) // 1e6, 'MB')
