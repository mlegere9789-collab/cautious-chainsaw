"""Warren sheet pixel <-> ground, with the SAME georeference the 1863 land-cover polygons were made with.

The land-cover reconstruction (docs/basemap1863/features/landcover) converted its Warren-sheet outlines with a similarity fit to road
centre lines plus a smooth free-form warp (scripts/warp.py there, fits in scripts/chamfer_fit.json and scripts/ffd_fit.json). A field
outline read on the same sheet must use the same transform, or it would sit 20-30 m off the woods it borders. This module repeats that
transform from the committed fit files (nothing is refitted here).

Needs numpy, pyproj and scipy (RectBivariateSpline, as the land-cover scripts do):  pip install scipy
Stated accuracy of the land-cover georeference: 30 to 40 m (docs/basemap1863/SOURCES-landcover.md, section 5).
"""
import os, sys, json
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
_LIB = os.path.join(ROOT, 'tmp', 'veg', 'pylib')
if os.path.isdir(_LIB) and _LIB not in sys.path:
    sys.path.append(_LIB)
from scipy.interpolate import RectBivariateSpline  # noqa: E402
from pyproj import Transformer  # noqa: E402

_S = os.path.join(ROOT, 'docs', 'basemap1863', 'features', 'landcover', 'scripts')
_F = json.load(open(os.path.join(_S, 'chamfer_fit.json')))
P = np.array(_F['p']); A0 = _F['A0']
_FF = json.load(open(os.path.join(_S, 'ffd_fit.json')))
_gx = np.array(_FF['gx']); _gy = np.array(_FF['gy']); _q = np.array(_FF['q']); _nx, _ny = len(_gx), len(_gy)
SX = RectBivariateSpline(_gy, _gx, _q[:_nx * _ny].reshape(_ny, _nx), kx=3, ky=3)
SY = RectBivariateSpline(_gy, _gx, _q[_nx * _ny:].reshape(_ny, _nx), kx=3, ky=3)
U2L = Transformer.from_crs(32618, 4326, always_xy=True)
L2U = Transformer.from_crs(4326, 32618, always_xy=True)
SHEET_W, SHEET_H = 8878, 9845


def px_to_utm(px, py):
    px = np.asarray(px, float); py = np.asarray(py, float)
    x0, y0 = px.copy(), py.copy()
    for _ in range(3):
        x0 = px - SX.ev(np.clip(y0, 0, SHEET_H), np.clip(x0, 0, SHEET_W)); y0 = py - SY.ev(np.clip(y0, 0, SHEET_H), np.clip(x0, 0, SHEET_W))
    tx, ty, s, th = P
    xx = x0 - A0[0]; yy = -(y0 - A0[1]); c, si = np.cos(th), np.sin(th)
    return tx + s * (c * xx - si * yy), ty + s * (si * xx + c * yy)


def utm_to_px(E, N):
    tx, ty, s, th = P; dE = np.asarray(E, float) - tx; dN = np.asarray(N, float) - ty; c, si = np.cos(th), np.sin(th)
    x = (c * dE + si * dN) / s; y = (-si * dE + c * dN) / s
    x0 = x + A0[0]; y0 = A0[1] - y
    return x0 + SX.ev(np.clip(y0, 0, SHEET_H), np.clip(x0, 0, SHEET_W)), y0 + SY.ev(np.clip(y0, 0, SHEET_H), np.clip(x0, 0, SHEET_W))


def px_to_ll(px, py):
    E, N = px_to_utm(px, py); lon, lat = U2L.transform(E, N); return lon, lat


def ll_to_px(lon, lat):
    E, N = L2U.transform(np.asarray(lon, float), np.asarray(lat, float)); return utm_to_px(E, N)


if __name__ == '__main__':
    # round trip and a known place: the Wheatfield polygon centre of the land-cover layer
    x, y = ll_to_px(-77.2423, 39.7972); lo, la = px_to_ll(x, y)
    print('Wheatfield centre px', float(x), float(y), 'round trip', float(lo), float(la))
