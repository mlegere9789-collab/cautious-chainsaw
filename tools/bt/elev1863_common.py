"""Shared helpers for the 1863 elevation-surface work (PDF B.9.2 steps 2 and 3).

Everything here READS the existing georeference work in docs/basemap1863 and tmp/b1863; it never edits it.
Scan pixel space: the 8878 x 9845 service JP2 of LOC 99448794 (Warren), x right, y down.
Ground space: EPSG:32618 (WGS 84 / UTM 18N), metres.

Two px -> UTM frames exist in the b1863 build:
  'affine' : docs/basemap1863/maps/transforms/warren-1869.json (23 control points; used for structures/roads)
  'ffd'    : similarity (chamfer_fit.json) + free-form deformation (ffd_fit.json) fitted to modern road
             centrelines (used for land cover).  Code copied in formula from
             docs/basemap1863/features/landcover/scripts/warp.py (not imported, so nothing there can change).
"""
import json
import os
import numpy as np
from scipy.interpolate import RectBivariateSpline

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
B = os.path.join(ROOT, 'docs', 'basemap1863')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'terrain', 'elev1863')
CACHE = os.path.join(ROOT, 'tmp', 'bt', 'elev1863')
os.makedirs(OUT, exist_ok=True)
os.makedirs(CACHE, exist_ok=True)

SCAN_GRAY = os.path.join(ROOT, 'tmp', 'b1863', 'landcover', 'warren_full_gray.png')   # 9845 x 8878 uint8, same pixels as cw0353500.jp2
SCAN_JP2 = os.path.join(ROOT, 'tmp', 'b1863', 'maps', 'scans', 'cw0353500.jp2')
WARREN_RASTER = os.path.join(ROOT, 'tmp', 'b1863', 'maps', 'georef', 'warren-1869.tif')   # affine frame, 1 m, EPSG:32618
DEM = os.path.join(ROOT, 'tmp', 'b1863', 'maps', 'ref', 'dem_1m.tif')                    # 3DEP 1 m, EPSG:32618, metres
CHM = os.path.join(ROOT, 'tmp', 'b1863', 'landcover', 'chm_final.npz')
W, H = 8878, 9845
FT = 0.3048

# DEM grid (EPSG:32618)
DEM_X0, DEM_Y0 = 301750.0, 4415750.0   # upper-left corner, 1 m cells


def load_affine():
    t = json.load(open(os.path.join(B, 'maps', 'transforms', 'warren-1869.json')))
    A = np.array(t['px_to_en']['A'])
    tt = np.array(t['px_to_en']['t'])
    Ai = np.array(t['en_to_px']['A'])
    ti = np.array(t['en_to_px']['t'])

    def px_to_utm(px, py):
        px = np.asarray(px, float)
        py = np.asarray(py, float)
        return A[0, 0] * px + A[0, 1] * py + tt[0], A[1, 0] * px + A[1, 1] * py + tt[1]

    def utm_to_px(E, N):
        E = np.asarray(E, float)
        N = np.asarray(N, float)
        return Ai[0, 0] * E + Ai[0, 1] * N + ti[0], Ai[1, 0] * E + Ai[1, 1] * N + ti[1]
    return px_to_utm, utm_to_px


def load_ffd():
    d = os.path.join(B, 'features', 'landcover', 'scripts')
    F = json.load(open(os.path.join(d, 'chamfer_fit.json')))
    P = np.array(F['p'])
    A0 = F['A0']
    FF = json.load(open(os.path.join(d, 'ffd_fit.json')))
    gx = np.array(FF['gx'])
    gy = np.array(FF['gy'])
    q = np.array(FF['q'])
    nx, ny = len(gx), len(gy)
    SX = RectBivariateSpline(gy, gx, q[:nx * ny].reshape(ny, nx), kx=3, ky=3)
    SY = RectBivariateSpline(gy, gx, q[nx * ny:].reshape(ny, nx), kx=3, ky=3)

    def px_to_utm(px, py):
        px = np.asarray(px, float)
        py = np.asarray(py, float)
        x0, y0 = px.copy(), py.copy()
        for _ in range(3):
            x0 = px - SX.ev(np.clip(y0, 0, H), np.clip(x0, 0, W))
            y0 = py - SY.ev(np.clip(y0, 0, H), np.clip(x0, 0, W))
        tx, ty, s, th = P
        xx = x0 - A0[0]
        yy = -(y0 - A0[1])
        c, si = np.cos(th), np.sin(th)
        return tx + s * (c * xx - si * yy), ty + s * (si * xx + c * yy)

    def utm_to_px(E, N):
        tx, ty, s, th = P
        dE = np.asarray(E, float) - tx
        dN = np.asarray(N, float) - ty
        c, si = np.cos(th), np.sin(th)
        x = (c * dE + si * dN) / s
        y = (-si * dE + c * dN) / s
        x0 = x + A0[0]
        y0 = A0[1] - y
        return x0 + SX.ev(np.clip(y0, 0, H), np.clip(x0, 0, W)), y0 + SY.ev(np.clip(y0, 0, H), np.clip(x0, 0, W))
    return px_to_utm, utm_to_px


def load_frame(name):
    if name == 'affine':
        return load_affine()
    if name == 'ffd':
        return load_ffd()
    raise ValueError(name)


def load_gcps():
    g = json.load(open(os.path.join(B, 'maps', 'gcps', 'warren.json')))
    return g['gcps'], g['lines']


def dem_sampler():
    """Return f(E, N) -> metres (bilinear) over the whole 1 m DEM, reading lazily in memory-mapped form."""
    import rasterio
    ds = rasterio.open(DEM)
    arr = ds.read(1)

    def f(E, N):
        E = np.asarray(E, float)
        N = np.asarray(N, float)
        x = E - DEM_X0 - 0.5
        y = DEM_Y0 - N - 0.5
        from scipy.ndimage import map_coordinates
        return map_coordinates(arr, [y.ravel(), x.ravel()], order=1, mode='nearest').reshape(E.shape)
    f.arr = arr
    return f
