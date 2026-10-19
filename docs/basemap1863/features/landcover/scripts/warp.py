import json, numpy as np, os
from scipy.interpolate import RectBivariateSpline
from pyproj import Transformer
_d = os.path.join(os.path.dirname(__file__), '..')
F = json.load(open(os.path.join(_d, 'chamfer_fit.json')))
P = np.array(F['p']); A0 = F['A0']
FF = json.load(open(os.path.join(_d, 'ffd_fit.json')))
gx = np.array(FF['gx']); gy = np.array(FF['gy']); q = np.array(FF['q']); nx, ny = len(gx), len(gy)
SX = RectBivariateSpline(gy, gx, q[:nx * ny].reshape(ny, nx), kx=3, ky=3)
SY = RectBivariateSpline(gy, gx, q[nx * ny:].reshape(ny, nx), kx=3, ky=3)
U2L = Transformer.from_crs(32618, 4326, always_xy=True)
L2U = Transformer.from_crs(4326, 32618, always_xy=True)
def px_to_utm(px, py, use_ffd=True):
    px = np.asarray(px, float); py = np.asarray(py, float)
    x0, y0 = px.copy(), py.copy()
    if use_ffd:
        for _ in range(3):
            x0 = px - SX.ev(np.clip(y0, 0, 9845), np.clip(x0, 0, 8878)); y0 = py - SY.ev(np.clip(y0, 0, 9845), np.clip(x0, 0, 8878))
    tx, ty, s, th = P
    xx = x0 - A0[0]; yy = -(y0 - A0[1]); c, si = np.cos(th), np.sin(th)
    return tx + s * (c * xx - si * yy), ty + s * (si * xx + c * yy)
def px_to_ll(px, py, use_ffd=True):
    E, N = px_to_utm(px, py, use_ffd); lon, lat = U2L.transform(E, N); return lon, lat
def utm_to_px(E, N, use_ffd=True):
    tx, ty, s, th = P; dE = np.asarray(E) - tx; dN = np.asarray(N) - ty; c, si = np.cos(th), np.sin(th)
    x = (c * dE + si * dN) / s; y = (-si * dE + c * dN) / s
    x0 = x + A0[0]; y0 = A0[1] - y
    if use_ffd: return x0 + SX.ev(np.clip(y0, 0, 9845), np.clip(x0, 0, 8878)), y0 + SY.ev(np.clip(y0, 0, 9845), np.clip(x0, 0, 8878))
    return x0, y0
