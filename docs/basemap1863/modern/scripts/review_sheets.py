"""Contact sheets for LOOKING at the masks: random 128 m windows, each as (plain photo | photo with the mask outlined), by mask class mix.
Usage: python review_sheets.py [n_per_sheet=6] [n_sheets=4] [seed]
Sheets go to previews/review_<k>.jpg (committed, small) ; the windows and what was seen are recorded by hand in results/visual_review.json."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio, cv2
from rasterio.windows import Window
import aoi_util as A
ROOT = A.ROOT
WORK = os.path.join(ROOT, 'tmp', 'b1863', 'modern', 'work'); OUT = os.path.join(ROOT, 'docs', 'basemap1863', 'modern')
os.makedirs(os.path.join(OUT, 'previews'), exist_ok=True)
n_per = int(sys.argv[1]) if len(sys.argv) > 1 else 6; n_sheets = int(sys.argv[2]) if len(sys.argv) > 2 else 4; seed = int(sys.argv[3]) if len(sys.argv) > 3 else 1
ds = rasterio.open(os.path.join(WORK, 'naip2013_1.0m.tif')); dm = rasterio.open(os.path.join(WORK, 'removal_mask_1m.tif'))
rng = np.random.default_rng(seed)
S = 128
COL = {1: (255, 0, 255), 2: (255, 255, 0), 3: (0, 255, 255), 4: (255, 128, 0), 5: (0, 128, 255), 6: (255, 0, 0), 7: (0, 0, 255)}
wins = []
while len(wins) < n_per * n_sheets:
    c = int(rng.integers(0, ds.width - S)); r = int(rng.integers(0, ds.height - S))
    m = dm.read(1, window=Window(c, r, S, S))
    if (m > 0).mean() < 0.01:
        continue
    wins.append((c, r, m))
meta = []
for k in range(n_sheets):
    tiles = []
    for (c, r, m) in wins[k * n_per:(k + 1) * n_per]:
        img = np.moveaxis(ds.read([1, 2, 3], window=Window(c, r, S, S)), 0, 2).copy()
        big = cv2.resize(img, (S * 3, S * 3), interpolation=cv2.INTER_CUBIC)
        ov = big.copy()
        mb = cv2.resize(m, (S * 3, S * 3), interpolation=cv2.INTER_NEAREST)
        for v, col in COL.items():
            mm = (mb == v).astype(np.uint8)
            if mm.any():
                cnts, _ = cv2.findContours(mm, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
                cv2.drawContours(ov, cnts, -1, col, 1)
        tiles.append(np.concatenate([big, ov], axis=1))
        meta.append(dict(sheet=k, col=c, row=r, classes={int(v): int((m == v).sum()) for v in np.unique(m) if v}))
    rows = [np.concatenate(tiles[i:i + 2], axis=1) for i in range(0, len(tiles), 2)]
    cv2.imwrite(os.path.join(OUT, 'previews', f'review_{seed}_{k}.jpg'), cv2.cvtColor(np.concatenate(rows, axis=0), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 82])
json.dump(meta, open(os.path.join(WORK, f'review_{seed}_meta.json'), 'w'))
print('legend: 1 magenta road, 2 yellow building, 3 cyan monument, 4 orange utility, 5 azure area-retexture, 6 red detected-unmapped, 7 blue water')
