"""Affine georeference of a Bachelder/Warren sheet (50% LOC image px <-> UTM18N metres)."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import *
class Affine:
    def __init__(self, M): self.M = np.array(M, float)       # 2x3: px = M @ [E,N,1]
    def ll2px(self, lng, lat):
        e, n = ll2m(lng, lat); p = self.M @ np.array([e, n, 1.0]); return float(p[0]), float(p[1])
    def px2ll(self, x, y):
        A = self.M[:, :2]; t = self.M[:, 2]
        e, n = np.linalg.solve(A, np.array([x, y]) - t); return m2ll(e, n)
    def px2m(self, x, y):
        A = self.M[:, :2]; t = self.M[:, 2]
        return tuple(np.linalg.solve(A, np.array([x, y]) - t))
def fit_affine(gcps):
    """gcps: list of (px, py, lng, lat). Least squares affine; returns Affine and residuals (m)."""
    A = []; bx = []; by = []
    for px, py, lng, lat in gcps:
        e, n = ll2m(lng, lat); A.append([e, n, 1]); bx.append(px); by.append(py)
    A = np.array(A); sx = np.linalg.lstsq(A, np.array(bx), rcond=None)[0]; sy = np.linalg.lstsq(A, np.array(by), rcond=None)[0]
    M = np.vstack([sx, sy]); af = Affine(M)
    res = []
    for px, py, lng, lat in gcps:
        qx, qy = af.px2m(px, py); e, n = ll2m(lng, lat); res.append(((qx - e) ** 2 + (qy - n) ** 2) ** .5)
    return af, res
def initial(diam_px, scale_m_per_px=2.06):
    e, n = ll2m(-77.230932, 39.830931); s = 1 / scale_m_per_px
    return Affine([[s, 0, diam_px[0] - s * e], [0, -s, diam_px[1] + s * n]])
