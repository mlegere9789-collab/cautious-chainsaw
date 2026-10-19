"""Thin-plate-spline georeference of Bachelder sheet 'a' built from (i) the b-maps agent's Warren GCPs (docs/basemap1863/maps/gcps/warren.json, mapped from the
cw0353500 scan to sheet 'a' by SIFT, scanmatch.py) and (ii) this task's own picks of road junctions / creek crossings (gcps_a_roads.json).
Reports leave-one-out error. px_sheet_a <-> UTM 18N."""
import sys, os, json, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from scipy.interpolate import RBFInterpolator
def _terms(x, y): return np.stack([np.ones_like(x), x, y], 1)
class TPS:
    def __init__(self, src, dst, smooth=0.5):
        src = np.asarray(src, float); dst = np.asarray(dst, float)
        self.c = src.mean(0); self.s = src.std(0).mean(); self.dc = dst.mean(0); self.ds = dst.std(0).mean()
        z = (src - self.c) / self.s; t = (dst - self.dc) / self.ds
        A = _terms(z[:, 0], z[:, 1]); self.aff = np.linalg.lstsq(A, t, rcond=None)[0]
        self.rbf = RBFInterpolator(z, t - A @ self.aff, kernel='thin_plate_spline', smoothing=smooth)
    def __call__(self, p):
        p = np.atleast_2d(np.asarray(p, float)); z = (p - self.c) / self.s
        return (_terms(z[:, 0], z[:, 1]) @ self.aff + self.rbf(z)) * self.ds + self.dc
def load_gcps():
    SM = json.load(open(os.path.join(ROOT, 'tmp/b1863/roads/scanmatch_pts.npy.json'))) if False else None
    pts = np.load(os.path.join(ROOT, 'tmp/b1863/roads/scanmatch_pts.npy'))
    M2 = np.linalg.lstsq(np.hstack([pts[:, :2], np.ones((len(pts), 1))]), pts[:, 2:], rcond=None)[0].T   # sheet a px -> cw px (50%)
    M3 = np.vstack([M2, [0, 0, 1]]); inv = np.linalg.inv(M3)
    g = []
    d = json.load(open(os.path.join(ROOT, 'docs/basemap1863/maps/gcps/warren.json')))
    for x in d['gcps']:
        if x.get('use', True) is False: continue
        q = inv @ np.array([x['px'][0] / 2, x['px'][1] / 2, 1.0])
        g.append(dict(id=x['id'], name=x['name'], src='b-maps (warren.json) via SIFT', px=[float(q[0]), float(q[1])], en=list(map(float, x['en']))))
    p = os.path.join(ROOT, 'docs/basemap1863/features/roads-rail-water/gcps_a_roads.json')
    if os.path.exists(p):
        for x in json.load(open(p))['gcps']:
            e, n = ll2m(x['lng'], x['lat'])
            g.append(dict(id=x['id'], name=x['name'], src='roads (own pick)', px=x['px'], en=[e, n]))
    return g
def build(smooth=0.5, drop=()):
    g = [x for x in load_gcps() if x['id'] not in drop]
    px = np.array([x['px'] for x in g]); en = np.array([x['en'] for x in g])
    return TPS(px, en, smooth), TPS(en, px, smooth), g
def loo(smooth=0.5):
    g = load_gcps(); px = np.array([x['px'] for x in g]); en = np.array([x['en'] for x in g]); res = []
    for i in range(len(g)):
        k = np.arange(len(g)) != i
        t = TPS(px[k], en[k], smooth); res.append(float(np.linalg.norm(t(px[i])[0] - en[i])))
    return g, res
if __name__ == '__main__':
    for sm in (0.0, 0.2, 0.5, 1.0, 3.0):
        g, r = loo(sm); r = np.array(r)
        print('smooth', sm, 'n', len(g), 'LOO rmse', round(float(np.sqrt(np.mean(r ** 2))), 1), 'median', round(float(np.median(r)), 1), 'max', round(float(r.max()), 1))
