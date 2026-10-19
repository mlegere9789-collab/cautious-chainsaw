"""Train and apply the pixel detector for modern pavement and roofs on the 1.0 m NAIP 2013-06-04 mosaic.

Usage (from scripts/):  OMP_NUM_THREADS=4 PYTHONUTF8=1 python detect.py
Inputs : tmp/b1863/modern/work/naip2013_1.0m.tif (make_base.py), work/inventory_utm.pkl (build_inventory.py)
Outputs: work/detect_class.tif (uint8: 0 none, 1 pavement, 2 roof), work/detect_ppav.tif, detect_proof.tif (uint8 probability 0..255)
         results/detect_cv.json  spatial hold-out evaluation against the weak (map-derived) labels
Spatial cross-validation: the AOI is cut into 1024 m blocks; checkerboard folds; train on one fold, test on the other, both ways.
"""
import os, sys, json, time, pickle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio
from rasterio.windows import Window
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import confusion_matrix
from pixfeat import feats, raster_labels
import aoi_util as A

ROOT = A.ROOT
WORK = os.path.join(ROOT, 'tmp', 'b1863', 'modern', 'work')
RES = float(os.environ.get('B1863_RES', '1.0'))
BASE = os.path.join(WORK, f'naip2013_{RES}m.tif')
BLK, PAD = 1024, 24
recs = pickle.load(open(os.path.join(WORK, 'inventory_utm.pkl'), 'rb'))
ds = rasterio.open(BASE)
H, W = ds.height, ds.width
b0 = ds.bounds


def read_block(r0, c0):
    h = min(BLK, H - r0); w = min(BLK, W - c0)
    pr0, pc0 = max(r0 - PAD, 0), max(c0 - PAD, 0)
    pr1, pc1 = min(r0 + h + PAD, H), min(c0 + w + PAD, W)
    a = ds.read(window=Window(pc0, pr0, pc1 - pc0, pr1 - pr0))
    return a, (r0 - pr0, c0 - pc0, h, w), (pr0, pc0, pr1, pc1)


def block_bounds(pr0, pc0, pr1, pc1):
    return (b0.left + pc0 * RES, b0.top - pr1 * RES, b0.left + pc1 * RES, b0.top - pr0 * RES)


blocks = [(r, c) for r in range(0, H, BLK) for c in range(0, W, BLK)]
rng = np.random.default_rng(1863)
X, Y, F = [], [], []
t0 = time.time()
for (r0, c0) in blocks:
    a, (ir, ic, h, w), (pr0, pc0, pr1, pc1) = read_block(r0, c0)
    if a[:3].max() == 0:
        continue
    lab = raster_labels(recs, block_bounds(pr0, pc0, pr1, pc1), RES, (pr1 - pr0, pc1 - pc0))[ir:ir + h, ic:ic + w]
    fe = feats(a)[:, ir:ir + h, ic:ic + w]
    fold = ((r0 // BLK) + (c0 // BLK)) % 2
    for k, cap in ((1, 3000), (2, 3000), (3, 4000)):
        idx = np.flatnonzero(lab.ravel() == k)
        if idx.size == 0:
            continue
        idx = rng.choice(idx, min(cap, idx.size), replace=False)
        X.append(fe.reshape(fe.shape[0], -1)[:, idx].T); Y.append(np.full(idx.size, 0 if k == 3 else k)); F.append(np.full(idx.size, fold))
X = np.concatenate(X); Y = np.concatenate(Y); F = np.concatenate(F)
print('samples', X.shape, np.bincount(Y), round(time.time() - t0), 's', flush=True)

cv = {}
for tr_f in (0, 1):
    m = HistGradientBoostingClassifier(max_iter=150, learning_rate=0.1, max_depth=8, random_state=1)
    m.fit(X[F == tr_f], Y[F == tr_f])
    pr = m.predict(X[F != tr_f]); cm = confusion_matrix(Y[F != tr_f], pr, labels=[0, 1, 2])
    cv[f'train_fold{tr_f}'] = cm.tolist()
cm = np.array(cv['train_fold0']) + np.array(cv['train_fold1'])
rec = {n: float(cm[i, i] / cm[i].sum()) for i, n in enumerate(['background', 'pavement', 'roof'])}
prec = {n: float(cm[i, i] / cm[:, i].sum()) for i, n in enumerate(['background', 'pavement', 'roof'])}
json.dump(dict(labels='0 background (>30 m from any mapped modern feature), 1 pavement (road core, parking), 2 roof (Adams 2023 outline eroded 1.5 m)', sampling='3000/3000/4000 pixels per class per 1 km block, checkerboard 2-fold spatial hold-out',
               confusion_rows_true_cols_pred=cm.tolist(), recall=rec, precision=prec, caveat='measured against the weak map-derived labels, not against hand-drawn truth; recall/precision on unmapped features is not measured here (see results/visual_review.json)'),
          open(os.path.join(ROOT, 'docs', 'basemap1863', 'modern', 'results', 'detect_cv.json'), 'w'), indent=1)
print('CV', rec, prec, flush=True)

model = HistGradientBoostingClassifier(max_iter=150, learning_rate=0.1, max_depth=8, random_state=1).fit(X, Y)
prof = dict(driver='GTiff', height=H, width=W, count=1, dtype='uint8', crs=ds.crs, transform=ds.transform, compress='deflate', tiled=True, blockxsize=512, blockysize=512)
oc = rasterio.open(os.path.join(WORK, 'detect_class.tif'), 'w', **prof)
op = rasterio.open(os.path.join(WORK, 'detect_ppav.tif'), 'w', **prof)
orf = rasterio.open(os.path.join(WORK, 'detect_proof.tif'), 'w', **prof)
for i, (r0, c0) in enumerate(blocks):
    a, (ir, ic, h, w), _ = read_block(r0, c0)
    if a[:3].max() == 0:
        continue
    fe = feats(a)[:, ir:ir + h, ic:ic + w].reshape(12, -1).T
    p = model.predict_proba(fe).reshape(h, w, 3)
    win = Window(c0, r0, w, h)
    op.write((p[..., 1] * 255).astype(np.uint8), 1, window=win)
    orf.write((p[..., 2] * 255).astype(np.uint8), 1, window=win)
    cls = np.zeros((h, w), np.uint8)
    cls[p[..., 1] > 0.5] = 1
    cls[(p[..., 2] > 0.5)] = 2
    oc.write(cls, 1, window=win)
    if i % 20 == 0:
        print('block', i, len(blocks), round(time.time() - t0), 's', flush=True)
oc.close(); op.close(); orf.close()
print('done')
