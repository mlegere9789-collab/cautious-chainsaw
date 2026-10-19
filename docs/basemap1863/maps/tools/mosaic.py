"""Mosaic the NAIP blocks into one 1 m RGB GeoTIFF (tmp), and the DEM blocks into one float32 GeoTIFF."""
import os, sys, glob, numpy as np
from PIL import Image
import rasterio
from rasterio.transform import from_origin
from common import *
BW, BH = 2250, 2150
kind = sys.argv[1]
W = ((AOI['e1'] - AOI['e0'] + BW - 1) // BW) * BW; H = ((AOI['n1'] - AOI['n0'] + BH - 1) // BH) * BH
tr = from_origin(AOI['e0'], AOI['n0'] + H, 1, 1)
if kind == 'naip':
    arr = np.zeros((3, H, W), np.uint8)
    for p in glob.glob(os.path.join(TMP, 'ref', 'naip', 'b_*_*.png')):
        e0, n0 = map(int, os.path.basename(p)[2:-4].split('_')); i = (e0 - AOI['e0']) // BW; j = (n0 - AOI['n0']) // BH
        a = np.array(Image.open(p).convert('RGB')); arr[:, H - (j + 1) * BH:H - j * BH, i * BW:(i + 1) * BW] = a.transpose(2, 0, 1)
    with rasterio.open(os.path.join(TMP, 'ref', 'naip_1m.tif'), 'w', driver='GTiff', width=W, height=H, count=3, dtype='uint8', crs=CRS, transform=tr, compress='deflate', tiled=True) as ds: ds.write(arr)
else:
    arr = np.full((H, W), np.nan, np.float32)
    for p in glob.glob(os.path.join(TMP, 'ref', 'dem', 'b_*_*.tif')):
        e0, n0 = map(int, os.path.basename(p)[2:-4].split('_')); i = (e0 - AOI['e0']) // BW; j = (n0 - AOI['n0']) // BH
        with rasterio.open(p) as ds: a = ds.read(1)
        arr[H - (j + 1) * BH:H - j * BH, i * BW:(i + 1) * BW] = a[::-1][::-1] if False else a
    with rasterio.open(os.path.join(TMP, 'ref', 'dem_1m.tif'), 'w', driver='GTiff', width=W, height=H, count=1, dtype='float32', crs=CRS, transform=tr, compress='deflate', tiled=True, nodata=np.nan) as ds: ds.write(arr, 1)
print(kind, W, H, 'done')
