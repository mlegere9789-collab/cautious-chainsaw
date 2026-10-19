"""4 ft (1.2192 m) contour image of the smoothed 3DEP DEM, 1 m px, black on white, 3 bands -> tmp/b1863/maps/ref/ct_1m.tif (index contour every 20 ft drawn 2 px). Vertical offset 0 (the map's datum is unknown)."""
import os, numpy as np, rasterio
from scipy import ndimage as ndi
from common import *
with rasterio.open(os.path.join(TMP, 'ref', 'dem_1m.tif')) as ds:
    z = ds.read(1); prof = ds.profile
z = np.nan_to_num(z, nan=float(np.nanmean(z))); z = ndi.gaussian_filter(z, 2.0)
iv = 1.2192
k = np.floor(z / iv).astype(np.int32)
m = np.zeros(z.shape, bool); idx = np.zeros(z.shape, bool)
d = (k[:, :-1] != k[:, 1:]); m[:, :-1] |= d; idx[:, :-1] |= d & ((np.maximum(k[:, :-1], k[:, 1:]) % 5) == 0)
d = (k[:-1, :] != k[1:, :]); m[:-1, :] |= d; idx[:-1, :] |= d & ((np.maximum(k[:-1, :], k[1:, :]) % 5) == 0)
idx = ndi.binary_dilation(idx, iterations=1)
a = np.where(m | idx, 40, 250).astype(np.uint8)
with rasterio.open(os.path.join(TMP, 'ref', 'ct_1m.tif'), 'w', driver='GTiff', width=a.shape[1], height=a.shape[0], count=3, dtype='uint8', crs=prof['crs'], transform=prof['transform'], compress='deflate', tiled=True) as o:
    for b in (1, 2, 3): o.write(a, b)
print('ok')
