"""Measure the horizontal offset between the vector inventory (Adams County 2023 building outlines) and the 2013 NAIP base.

For up to 4000 buildings of 120..2500 m2: the mean gradient magnitude (Sobel of luminance, 1 m px) sampled along the outline is computed for shifts
dx,dy in -6..+6 m (1 m steps); the shift with the highest mean gradient is that building's best shift. Per 2 km cell the median best shift is the
cell's offset. Roof lean (relief displacement) and 2013-vs-2023 changes make single buildings noisy; the median over many buildings is the estimate,
and the spread (median absolute deviation) is reported with it.
Writes results/registration.json. Run after make_base.py.
"""
import os, sys, json, pickle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio, cv2
from shapely.geometry import Polygon
import aoi_util as A
ROOT = A.ROOT
MOD = os.path.join(ROOT, 'tmp', 'b1863', 'modern')
RES = float(os.environ.get('B1863_RES', '1.0'))
ds = rasterio.open(os.path.join(MOD, 'work', f'naip2013_{RES}m.tif'))
recs = pickle.load(open(os.path.join(MOD, 'work', 'inventory_utm.pkl'), 'rb'))
bl = [r for r in recs if r['cls'] == 'BUILDING' and r['geom'].geom_type == 'Polygon' and 120 < r['geom'].area < 2500 and r['src'] == 'ADAMS']
rng = np.random.default_rng(7)
rng.shuffle(bl)
bl = bl[:4000]
x0, y1 = ds.bounds.left, ds.bounds.top
res = []
SH = np.arange(-6, 7)
for r in bl:
    g = r['geom']
    minx, miny, maxx, maxy = g.bounds
    c0, c1 = int((minx - x0) / RES) - 10, int((maxx - x0) / RES) + 11
    r0, r1 = int((y1 - maxy) / RES) - 10, int((y1 - miny) / RES) + 11
    if c0 < 0 or r0 < 0 or c1 > ds.width or r1 > ds.height:
        continue
    a = ds.read(window=rasterio.windows.Window(c0, r0, c1 - c0, r1 - r0))
    lum = (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]).astype(np.float32)
    gx = cv2.Sobel(lum, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(lum, cv2.CV_32F, 0, 1, ksize=3)
    gm = cv2.GaussianBlur(np.hypot(gx, gy), (0, 0), 0.8)
    ring = np.array(g.exterior.coords)
    # densify outline at 0.5 m
    pts = []
    for p, q in zip(ring[:-1], ring[1:]):
        n = max(int(np.hypot(*(q - p)) / 0.5), 1)
        for t in np.linspace(0, 1, n, endpoint=False):
            pts.append(p + (q - p) * t)
    pts = np.array(pts)
    best, bs = (0, 0), -1
    for dy in SH:
        for dx in SH:
            cx = ((pts[:, 0] + dx - x0) / RES - c0).astype(int)
            cy = ((y1 - (pts[:, 1] + dy)) / RES - r0).astype(int)
            if (cx < 0).any() or (cy < 0).any() or (cx >= gm.shape[1]).any() or (cy >= gm.shape[0]).any():
                bs = -1
                break
            s = gm[cy, cx].mean()
            if s > bs:
                bs, best = s, (dx, dy)
    if bs > 0:
        res.append((g.centroid.x, g.centroid.y, best[0], best[1], bs))
res = np.array(res)
out = dict(n_buildings=int(len(res)), shift_range_m=[-6, 6])
out['global_median_dx_m'] = float(np.median(res[:, 2])); out['global_median_dy_m'] = float(np.median(res[:, 3]))
out['global_mad_dx_m'] = float(1.4826 * np.median(np.abs(res[:, 2] - np.median(res[:, 2])))); out['global_mad_dy_m'] = float(1.4826 * np.median(np.abs(res[:, 3] - np.median(res[:, 3]))))
cells = {}
for cx_, cy_ in {(int((x - x0) // 2000), int((y1 - y) // 2000)) for x, y, *_ in res}:
    m = res[(((res[:, 0] - x0) // 2000).astype(int) == cx_) & (((y1 - res[:, 1]) // 2000).astype(int) == cy_)]
    if len(m) >= 25:
        cells[f'{cx_},{cy_}'] = dict(n=int(len(m)), dx=float(np.median(m[:, 2])), dy=float(np.median(m[:, 3])), mad_dx=float(1.4826 * np.median(np.abs(m[:, 2] - np.median(m[:, 2])))), mad_dy=float(1.4826 * np.median(np.abs(m[:, 3] - np.median(m[:, 3])))))
out['cells_2km'] = cells
out['note'] = 'dx,dy = shift to ADD to the Adams outline (UTM18N east/north, metres) so that it lies on the 2013 image edges. Zero means the vectors already fit.'
json.dump(out, open(os.path.join(ROOT, 'docs', 'basemap1863', 'modern', 'results', 'registration.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != 'cells_2km'}, indent=1)); print(len(cells), 'cells')
for k, v in sorted(cells.items()):
    print(k, v)
