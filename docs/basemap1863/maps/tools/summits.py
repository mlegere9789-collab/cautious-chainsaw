"""Local maxima (summits) of the 3DEP DEM in the AOI with prominence >= P metres; writes tmp/b1863/maps/ref/summits.json"""
import glob, json, os, sys, numpy as np, rasterio
from scipy import ndimage as ndi
from common import *
BW, BH = 2250, 2150
P = float(sys.argv[1]) if len(sys.argv) > 1 else 6
files = glob.glob(os.path.join(TMP, 'ref', 'dem', 'b_*_*.tif'))
e0s = sorted({int(os.path.basename(f).split('_')[1]) for f in files}); n0s = sorted({int(os.path.basename(f).split('_')[2][:-4]) for f in files})
E0, N0 = min(e0s), min(n0s); W = (max(e0s) - E0) + BW; H = (max(n0s) - N0) + BH
a = np.full((H, W), np.nan, np.float32)
for f in files:
    e0 = int(os.path.basename(f).split('_')[1]); n0 = int(os.path.basename(f).split('_')[2][:-4])
    with rasterio.open(f) as ds: b = ds.read(1)
    r1 = H - (n0 - N0); a[r1 - BH:r1, e0 - E0:e0 - E0 + BW] = b
d = ndi.gaussian_filter(np.nan_to_num(a, nan=float(np.nanmin(a))), 3)
mx = (d == ndi.maximum_filter(d, size=61)) & (d > 0)
res = []
for r, c in zip(*np.nonzero(mx)):
    # prominence approx: max in ring radius 250 m minus... use min of ring maxima: height above lowest of ring percentile
    rr = 250; r0, r1_, c0, c1 = max(0, r - rr), min(H, r + rr + 1), max(0, c - rr), min(W, c + rr + 1)
    patch = d[r0:r1_, c0:c1]
    prom = d[r, c] - np.percentile(patch, 10)
    if prom >= P: res.append(dict(e=E0 + int(c), n=N0 + (H - 1 - int(r)), z=round(float(a[r, c]), 1), prom=round(float(prom), 1)))
res.sort(key=lambda x: -x['prom'])
json.dump(res, open(os.path.join(TMP, 'ref', 'summits.json'), 'w'))
for x in res[:60]: print(x)
print(len(res))
