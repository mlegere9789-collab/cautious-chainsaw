"""Prepare a 2 m slope-magnitude raster from the 3DEP 1 m DEM (read from the b-maps agent's cache; read only) -> tmp/b1863/roads/dem2m_slope.npy"""
import os, sys, numpy as np, rasterio, psutil
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(__file__))
from common import *
try: psutil.Process().nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception: pass
src = os.path.join(ROOT, 'tmp/b1863/maps/ref/dem_1m.tif')
ds = rasterio.open(src); a = ds.read(1)
a = np.where(np.isfinite(a) & (a > 0), a, np.nan)
H, W = a.shape; H2, W2 = H // 2, W // 2
b = np.nanmean(a[:H2 * 2, :W2 * 2].reshape(H2, 2, W2, 2), axis=(1, 3))
b = np.where(np.isnan(b), np.nanmean(b), b).astype(np.float32)
z = ndi.gaussian_filter(b, 1.0)
gy, gx = np.gradient(z, 2.0)
slope = np.hypot(gx, gy).astype(np.float32)
meta = dict(E0=float(ds.bounds.left), N1=float(ds.bounds.top), res=2.0, W=W2, H=H2)
np.save(os.path.join(ROOT, 'tmp/b1863/roads/dem2m_slope.npy'), slope); np.save(os.path.join(ROOT, 'tmp/b1863/roads/dem2m_z.npy'), z)
import json; json.dump(meta, open(os.path.join(ROOT, 'tmp/b1863/roads/dem2m_meta.json'), 'w')); print(meta, slope.shape, float(np.nanmax(slope)))
