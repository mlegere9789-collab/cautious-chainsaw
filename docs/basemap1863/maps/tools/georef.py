"""Fit, cross-validate and apply transforms between a map scan (pixels) and the ground (UTM 18N metres).

GCP file (docs/basemap1863/maps/gcps/<map>.json):
  { "map": id, "scan": "cw0353500.jp2", "gcps": [ {"id","name","px":[x,y],"en":[E,N],"w":1.0,"kind","evidence","note"} ... ] }

Models (all fit px->EN and EN->px separately):  affine | poly2 | poly3 | tps (thin-plate spline with smoothing, on top of an affine).
Reported: fit RMSE, leave-one-out RMSE (the honest number: each GCP predicted without itself), max error, and a distortion grid.
"""
import json, os, sys, numpy as np
from scipy.interpolate import RBFInterpolator
from common import *

def _terms(deg, x, y):
    cols = [np.ones_like(x)]
    for d in range(1, deg + 1):
        for k in range(d + 1): cols.append(x ** (d - k) * y ** k)
    return np.stack(cols, 1)

class Model:
    """fits src(N,2)->dst(N,2).  kind in affine, poly2, poly3, tps.  Source is normalised internally."""
    def __init__(self, kind, smooth=0.0):
        self.kind, self.smooth = kind, smooth
    def fit(self, src, dst, w=None):
        src = np.asarray(src, float); dst = np.asarray(dst, float)
        self.c = src.mean(0); self.s = src.std(0).mean() or 1.0
        z = (src - self.c) / self.s
        self.dc = dst.mean(0); self.ds = dst.std(0).mean() or 1.0
        t = (dst - self.dc) / self.ds
        if self.kind in ('affine', 'poly2', 'poly3'):
            deg = {'affine': 1, 'poly2': 2, 'poly3': 3}[self.kind]
            A = _terms(deg, z[:, 0], z[:, 1]); W = np.ones(len(z)) if w is None else np.asarray(w, float)
            self.coef = np.linalg.lstsq(A * W[:, None], t * W[:, None], rcond=None)[0]; self.deg = deg
        else:
            A = _terms(1, z[:, 0], z[:, 1]); coef = np.linalg.lstsq(A, t, rcond=None)[0]
            res = t - A @ coef
            self.aff = coef
            self.rbf = RBFInterpolator(z, res, kernel='thin_plate_spline', smoothing=self.smooth)
        return self
    def __call__(self, p):
        p = np.atleast_2d(np.asarray(p, float)); z = (p - self.c) / self.s
        if self.kind in ('affine', 'poly2', 'poly3'): t = _terms(self.deg, z[:, 0], z[:, 1]) @ self.coef
        else: t = _terms(1, z[:, 0], z[:, 1]) @ self.aff + self.rbf(z)
        return t * self.ds + self.dc

def load_gcps(path):
    d = json.load(open(path)); g = [x for x in d['gcps'] if x.get('use', True)]
    return d, np.array([x['px'] for x in g], float), np.array([x['en'] for x in g], float), g

def evaluate(px, en, kind, smooth=0.0):
    """fit px->en, return fit residuals and leave-one-out residuals (metres)."""
    m = Model(kind, smooth).fit(px, en); fit = np.linalg.norm(m(px) - en, axis=1)
    loo = np.zeros(len(px))
    for i in range(len(px)):
        k = np.arange(len(px)) != i
        mi = Model(kind, smooth).fit(px[k], en[k]); loo[i] = np.linalg.norm(mi(px[i]) - en[i])
    return m, fit, loo

def rms(a): return float(np.sqrt(np.mean(np.square(a)))) if len(a) else float('nan')

def summary(px, en, kinds=(('affine', 0), ('poly2', 0), ('poly3', 0), ('tps', 0), ('tps', 0.05), ('tps', 0.5))):
    out = []
    for k, s in kinds:
        need = {'affine': 3, 'poly2': 6, 'poly3': 10}.get(k, 4)
        if len(px) < need + 2: continue
        m, fit, loo = evaluate(px, en, k, s)
        out.append(dict(model=k, smooth=s, n=len(px), fit_rmse_m=round(rms(fit), 2), loo_rmse_m=round(rms(loo), 2), loo_max_m=round(float(loo.max()), 2), loo_median_m=round(float(np.median(loo)), 2)))
    return out
