"""Experiment: match Warren contour ink to DEM-derived 4 ft contours in local windows."""
import os, sys, numpy as np, cv2, rasterio
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
from scipy import ndimage as ndi
from common import *
cv2.setNumThreads(2)
dem_ds = rasterio.open(os.path.join(TMP, 'ref', 'dem_1m.tif')); T = dem_ds.transform
def window(e0, n0, w, h):
    from rasterio.windows import Window
    return dem_ds.read(1, window=Window(int(e0 - T.c), int(T.f - n0 - h), w, h), boundless=True, fill_value=np.nan)
def contour_img(z, c, sig=2.0, iv=1.2192):
    z = ndi.gaussian_filter(np.nan_to_num(z, nan=np.nanmean(z)), sig)
    k = np.floor((z - c) / iv)
    m = np.zeros(z.shape, np.uint8)
    m[:, :-1] |= (k[:, :-1] != k[:, 1:]); m[:-1, :] |= (k[:-1, :] != k[1:, :])
    return m.astype(np.float32)
def scan_ground(scan_small, A, e0, n0, w, h):
    """resample scan (full-res PIL image) into ground window (north up, 1 m) with affine ground->px  px = A @ [E,N,1]"""
    # cv2.warpAffine maps dst(x,y)->src via M (with WARP_INVERSE_MAP): src = M @ [x,y,1]; dst x = E-e0, y = (n0+h)-N
    M = np.array([[A[0][0], -A[0][1], A[0][0] * e0 + A[0][1] * (n0 + h) + A[0][2]], [A[1][0], -A[1][1], A[1][0] * e0 + A[1][1] * (n0 + h) + A[1][2]]], np.float64)
    return cv2.warpAffine(scan_small, M, (w, h), flags=cv2.INTER_AREA | cv2.WARP_INVERSE_MAP, borderValue=255)
