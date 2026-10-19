"""24 random 'DETECTED_UNMAPPED' components (class 6), each 64 m window, plain | outlined, for counting by eye how many are real modern surfaces.
Output previews/unmapped_<seed>_<k>.jpg ; the tally is written by hand to results/visual_review.json."""
import os, sys, pickle, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio, cv2
from rasterio.windows import Window
import aoi_util as A
ROOT = A.ROOT; WORK = os.path.join(ROOT, 'tmp', 'b1863', 'modern', 'work'); OUT = os.path.join(ROOT, 'docs', 'basemap1863', 'modern')
seed = int(sys.argv[1]) if len(sys.argv) > 1 else 5
polys = pickle.load(open(os.path.join(WORK, 'unmapped_polys.pkl'), 'rb'))
ds = rasterio.open(os.path.join(WORK, 'naip2013_1.0m.tif')); dm = rasterio.open(os.path.join(WORK, 'removal_mask_1m.tif'))
rng = np.random.default_rng(seed); idx = rng.choice(len(polys), 24, replace=False)
x0, y1 = ds.bounds.left, ds.bounds.top; S = 64
tiles = []
for k, i in enumerate(idx):
    c = polys[i].centroid; col = int(c.x - x0 - S // 2); row = int(y1 - c.y - S // 2)
    col = min(max(col, 0), ds.width - S); row = min(max(row, 0), ds.height - S)
    img = np.moveaxis(ds.read([1, 2, 3], window=Window(col, row, S, S)), 0, 2).copy(); m = dm.read(1, window=Window(col, row, S, S))
    big = cv2.resize(img, (S * 4, S * 4), interpolation=cv2.INTER_CUBIC); ov = big.copy()
    mm = cv2.resize((m == 6).astype(np.uint8), (S * 4, S * 4), interpolation=cv2.INTER_NEAREST)
    cn, _ = cv2.findContours(mm, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE); cv2.drawContours(ov, cn, -1, (255, 0, 0), 1)
    t = np.concatenate([big, ov], axis=1); cv2.putText(t, str(k), (4, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    tiles.append(t)
for s in range(2):
    rows = [np.concatenate(tiles[s * 12 + j * 2: s * 12 + j * 2 + 2], axis=1) for j in range(6)]
    cv2.imwrite(os.path.join(OUT, 'previews', f'unmapped_{seed}_{s}.jpg'), cv2.cvtColor(np.concatenate(rows, axis=0), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 80])
print('ok')
