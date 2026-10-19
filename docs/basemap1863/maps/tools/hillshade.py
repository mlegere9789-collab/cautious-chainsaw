"""Hillshade of the 1 m 3DEP DEM (sigma 1.5 m smoothing) -> tmp/b1863/maps/ref/hs_1m.tif (uint8, 3 identical bands so viewers can treat it like RGB)."""
import os, numpy as np, rasterio
from scipy import ndimage as ndi
from common import *
with rasterio.open(os.path.join(TMP, 'ref', 'dem_1m.tif')) as ds:
    z = ds.read(1); prof = ds.profile
z = np.nan_to_num(z, nan=float(np.nanmean(z)))
z = ndi.gaussian_filter(z, 1.5)
dzdy, dzdx = np.gradient(z, 1.0)
slope = np.arctan(np.hypot(dzdx, dzdy)); asp = np.arctan2(-dzdx, dzdy)
hs = np.zeros_like(z)
for az in (315, 45, 225, 135):
    a = np.radians(az); alt = np.radians(40)
    h = np.cos(alt) * np.cos(slope) + np.sin(alt) * np.sin(slope) * np.cos(a - asp)
    hs += h * (2 if az == 315 else 1)
hs /= 5; hs = np.clip((hs - 0.45) / 0.45, 0, 1)
a = (hs * 255).astype(np.uint8)
with rasterio.open(os.path.join(TMP, 'ref', 'hs_1m.tif'), 'w', driver='GTiff', width=a.shape[1], height=a.shape[0], count=3, dtype='uint8', crs=prof['crs'], transform=prof['transform'], compress='deflate', tiled=True) as o:
    for b in (1, 2, 3): o.write(a, b)
print('ok')
