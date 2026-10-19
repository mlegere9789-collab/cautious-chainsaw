"""Closed-loop check of the removal: does a modern-surface detector still find modern surface where we filled?

An RGB-only detector (the removal works on R,G,B; NIR is not filled) is trained on map-derived weak labels from 60 random 1 km blocks (the same label rules as detect.py:
pavement, roof, background). It is applied to each of the 20 test windows of inpaint_test.py before and after filling, by each method.
Reported: mean P(pavement or roof) over the mask pixels (before, after telea, after ns, after exemplar) and the share of mask pixels with P > 0.5.
A good removal brings P down to the background level; the background level itself is measured on untouched ground (>= 40 m from any mask) in the same windows.
Writes results/closedloop.json."""
import os, sys, json, pickle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio, cv2
from rasterio.windows import Window
from sklearn.ensemble import HistGradientBoostingClassifier
import aoi_util as A
import inpaint_methods as IM
from pixfeat import raster_labels
ROOT = A.ROOT; WORK = os.path.join(ROOT, 'tmp', 'b1863', 'modern', 'work'); OUT = os.path.join(ROOT, 'docs', 'basemap1863', 'modern')
ds = rasterio.open(os.path.join(WORK, 'naip2013_1.0m.tif')); dm = rasterio.open(os.path.join(WORK, 'removal_mask_1m.tif'))
recs = pickle.load(open(os.path.join(WORK, 'inventory_utm.pkl'), 'rb'))
x0, y1 = ds.bounds.left, ds.bounds.top


def rgbfeat(rgb):
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / (mx + 1e-3)

    def lstd(a, k):
        m = cv2.blur(a, (k, k)); return np.sqrt(np.maximum(cv2.blur(a * a, (k, k)) - m * m, 0))
    ctx = cv2.blur(lum, (31, 31))
    return np.stack([r, g, b, lum, sat * 100, (r - b) / (r + b + 1e-3) * 100, (g - r) / (g + r + 1e-3) * 100, lstd(lum, 3), lstd(lum, 9), ctx, lum - ctx], -1)


rng = np.random.default_rng(77)
X, Y = [], []
S = 1024
for _ in range(60):
    c = int(rng.integers(0, ds.width - S)); r = int(rng.integers(0, ds.height - S))
    a = ds.read(window=Window(c, r, S, S))
    if a[:3].max() == 0: continue
    b = (x0 + c, y1 - r - S, x0 + c + S, y1 - r)
    lab = raster_labels(recs, b, 1.0, (S, S))
    fe = rgbfeat(np.moveaxis(a[:3], 0, 2))
    for k, cap in ((1, 2500), (2, 2500), (3, 3500)):
        idx = np.flatnonzero(lab.ravel() == k)
        if idx.size == 0: continue
        idx = rng.choice(idx, min(cap, idx.size), replace=False)
        X.append(fe.reshape(-1, fe.shape[-1])[idx]); Y.append(np.full(idx.size, 0 if k == 3 else k))
X = np.concatenate(X); Y = np.concatenate(Y)
model = HistGradientBoostingClassifier(max_iter=120, max_depth=8, random_state=1).fit(X, Y)
print('trained', X.shape, np.bincount(Y), flush=True)


def pmod(rgb):
    p = model.predict_proba(rgbfeat(rgb).reshape(-1, 11)).reshape(rgb.shape[0], rgb.shape[1], 3)
    return 1 - p[..., 0]


inp = json.load(open(os.path.join(OUT, 'results', 'inpaint_test.json'), encoding='utf8'))
rows = []
PATCH = (1, 2, 3, 4, 6)
SZ = inp['window_m']
for site in inp['per_site']:
    c0 = int(site['x'] - x0 - SZ // 2); r0 = int(y1 - site['y'] - SZ // 2)
    c0 = min(max(c0, 0), ds.width - SZ); r0 = min(max(r0, 0), ds.height - SZ)
    win = Window(c0, r0, SZ, SZ)
    img = np.moveaxis(ds.read([1, 2, 3], window=win), 0, 2).copy(); mfull = dm.read(1, window=win)
    m = np.isin(mfull, PATCH)
    far = ~cv2.dilate((mfull > 0).astype(np.uint8), np.ones((81, 81), np.uint8)).astype(bool)
    res = dict(site=site['site'], mask_px=int(m.sum()))
    p0 = pmod(img)
    res['before_mean_p'] = round(float(p0[m].mean()), 3); res['before_share_gt0.5'] = round(float((p0[m] > 0.5).mean()), 3)
    res['untouched_ground_mean_p'] = round(float(p0[far].mean()), 3) if far.sum() > 100 else None
    for mn, fn in IM.METHODS.items():
        o = fn(img, m); p1 = pmod(o)
        res[mn] = dict(mean_p=round(float(p1[m].mean()), 3), share_gt0p5=round(float((p1[m] > 0.5).mean()), 3))
    rows.append(res); print(res, flush=True)
agg = {k: round(float(np.mean([r[k]['mean_p'] if isinstance(r[k], dict) else r[k] for r in rows])), 3) for k in ('telea', 'ns', 'exemplar')}
agg['before'] = round(float(np.mean([r['before_mean_p'] for r in rows])), 3)
agg['untouched_ground'] = round(float(np.mean([r['untouched_ground_mean_p'] for r in rows if r['untouched_ground_mean_p'] is not None])), 3)
agg['share_gt0p5'] = {k: round(float(np.mean([r[k]['share_gt0p5'] for r in rows])), 3) for k in ('telea', 'ns', 'exemplar')}
agg['share_gt0p5']['before'] = round(float(np.mean([r['before_share_gt0.5'] for r in rows])), 3)
json.dump(dict(detector='RGB-only gradient-boosted trees, weak map labels, 60 random 1 km blocks', per_site=rows, mean_over_sites=agg,
               reading='mean P(modern surface) inside the mask; lower is better; the floor is the value on untouched ground'), open(os.path.join(OUT, 'results', 'closedloop.json'), 'w'), indent=1)
print(agg)
