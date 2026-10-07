"""Seam check on rendered pictures: tile seams would show as a column / row whose mean 1-px gradient stands out against its neighbours.
Prints, per picture, the strongest column and row outliers (in robust sigmas) and whether any lies at a tile boundary computed from the camera.
An outlier that sits on a tile boundary is then tested for being a SEAM or a real feature (a wall, a road, a label that happens to run along the boundary): a seam stands out along the
whole length of the row/column, a feature only where it is; the line is cut in 8 segments and it is a seam only when at least 6 of them stand out (gradient > 2x the neighbouring lines').
Usage: python seams.py <dir of previews named <spot>-z<zoom>-<look>.png>   -> prints, and writes results/seams.json"""
import json, math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from common import *
def check(path, lng, lat, z, w=1440, h=900):
    a = np.asarray(Image.open(path).convert('L'), dtype=np.float32)
    gx = np.abs(np.diff(a, axis=1)).mean(axis=0)            # per column boundary
    gy = np.abs(np.diff(a, axis=0)).mean(axis=1)
    def outliers(g):
        base = np.convolve(g, np.ones(9) / 9, mode='same'); r = g - base; s = np.median(np.abs(r)) * 1.4826 + 1e-9
        idx = np.argsort(-np.abs(r))[:3]; return [(int(i), round(float(r[i] / s), 1)) for i in idx]
    cx, cy = world_px(lng, lat, z)
    out = {}
    for L in (int(math.floor(z)), int(math.floor(z)) + 1):
        ts = TILE * 2 ** (z - L)
        xs = [round((tx * ts) - (cx - w / 2)) for tx in range(int((cx - w / 2) // ts), int((cx + w / 2) // ts) + 2)]
        ys = [round((ty * ts) - (cy - h / 2)) for ty in range(int((cy - h / 2) // ts), int((cy + h / 2) // ts) + 2)]
        out[L] = (xs, ys)
    return outliers(gx), outliers(gy), out
def is_seam(path, kind, i):
    """True when line i (column or row) stands out against its neighbours along most of its length"""
    a = np.asarray(Image.open(path).convert('L'), dtype=np.float32)
    g = np.abs(np.diff(a, axis=1 if kind == 'col' else 0)); n = g.shape[0] if kind == 'col' else g.shape[1]; hits = 0
    for k in range(8):
        sl = slice(k * n // 8, (k + 1) * n // 8)
        line = g[sl, i].mean() if kind == 'col' else g[i, sl].mean()
        nb = np.mean([(g[sl, j].mean() if kind == 'col' else g[j, sl].mean()) for j in list(range(i - 5, i - 1)) + list(range(i + 2, i + 6)) if 0 <= j < (g.shape[1] if kind == 'col' else g.shape[0])])
        if line > 2.0 * nb + 0.5: hits += 1
    return hits >= 6, hits


if __name__ == '__main__':
    d = sys.argv[1]
    spots = {'angle': (-77.2347, 39.8117), 'wheatfield': (-77.2417, 39.7994), 'cemhill': (-77.2262, 39.8189)}
    res = []
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.png') or '-z' not in fn: continue
        sp = fn.split('-z')[0]; z = float(fn.split('-z')[1].split('-')[0])
        if sp not in spots: continue
        path = os.path.join(d, fn)
        ox, oy, bd = check(path, *spots[sp], z)
        near = lambda i, xs: any(abs(i - x) <= 1 for x in xs)
        flag = [('col', i, s) for i, s in ox if near(i, sum((v[0] for v in bd.values()), [])) and abs(s) > 6] + [('row', i, s) for i, s in oy if near(i, sum((v[1] for v in bd.values()), [])) and abs(s) > 6]
        judged = []
        for kind, i, sg in flag:
            seam, hits = is_seam(path, kind, i); judged.append(dict(kind=kind, index=i, sigma=sg, standsOutAlongSegments=hits, seam=bool(seam)))
        print(fn, 'col outliers', ox, 'row outliers', oy, 'boundary outliers:', judged if judged else 'none')
        res.append(dict(picture=fn, colOutliers=ox, rowOutliers=oy, boundaryOutliers=judged))
    os.makedirs(os.path.join(os.path.dirname(__file__), 'results'), exist_ok=True)
    json.dump(dict(seamsFound=sum(1 for r in res for b in r['boundaryOutliers'] if b['seam']), pictures=len(res), results=res), open(os.path.join(os.path.dirname(__file__), 'results', 'seams.json'), 'w'), indent=1, default=float)
    print('pictures', len(res), 'seams found', sum(1 for r in res for b in r['boundaryOutliers'] if b['seam']))
