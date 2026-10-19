"""Same visibility test as monuments_check.py on the 0.6 m NAIP 2019-09-27 flight (read from the COGs by range requests), to show what a finer photograph would resolve.
Anomaly statistic and control are identical, in metres: disc 3.5 m, ring 8-20 m, 1000 random open-ground controls. Writes results/monuments_0p6.json."""
import os, sys, json, pickle, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio
from rasterio.windows import from_bounds
import aoi_util as A
from shapely.strtree import STRtree
from shapely.geometry import Point
ROOT = A.ROOT; MOD = os.path.join(ROOT, 'tmp', 'b1863', 'modern')
sys.path.insert(0, MOD)
import pcnaip
cat = [f for f in pcnaip.items() if '20190927' in f['id'] and f['id'].startswith('pa_')]
recs = pickle.load(open(os.path.join(MOD, 'work', 'inventory_utm.pkl'), 'rb'))
mons = [r for r in recs if r['cls'] == 'MONUMENT']
RES = 0.6; HW = 20.0
n = int(2 * HW / RES) + 1
yy, xx = np.mgrid[:n, :n]; d = np.hypot(yy - n // 2, xx - n // 2) * RES
disc = d <= 3.5; ring = (d >= 8) & (d <= 20)
env = rasterio.Env(GDAL_HTTP_USERAGENT=pcnaip.UA, GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_MAX_RETRY='4', GDAL_HTTP_RETRY_DELAY='3')
env.__enter__()
dsets = {}
def ds_for(x, y):
    for f in cat:
        b = f['properties']['proj:bbox']
        if b[0] + 30 < x < b[2] - 30 and b[1] + 30 < y < b[3] - 30:
            if f['id'] not in dsets:
                dsets[f['id']] = rasterio.open(pcnaip.signed(f['assets']['image']['href']))
            return dsets[f['id']]
def stat(x, y):
    ds = ds_for(x, y)
    if ds is None: return None
    win = from_bounds(x - HW - RES / 2, y - HW - RES / 2, x + HW + RES / 2, y + HW + RES / 2, ds.transform)
    a = ds.read([1, 2, 3], window=win, out_shape=(3, n, n), boundless=True, fill_value=0).astype(np.float32)
    lum = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]
    if (lum == 0).mean() > 0.01: return None
    med = np.median(lum[ring]); mad = 1.4826 * np.median(np.abs(lum[ring] - med)) + 1.0
    z = np.where(disc, np.abs(lum - med) / mad, -1)
    return float(z.max())
t = time.time(); A_ = []
for r in mons:
    g = r['geom'].centroid; s = stat(g.x, g.y)
    if s is not None: A_.append(s)
    if len(A_) % 200 == 0: print(len(A_), round(time.time() - t), 's', flush=True)
x0, y0, x1, y1 = 299220.0, 4403040.0, 316500.0, 4416660.0
rng = np.random.default_rng(3)
tree = STRtree([r['geom'] for r in recs if r['cls'] in ('ROAD_ARTERIAL', 'ROAD_LOCAL', 'ROAD_SERVICE', 'PATH', 'BUILDING', 'PARKING', 'MONUMENT', 'POWER_SUPPORT', 'FENCE_WALL')])
ctrl = []
while len(ctrl) < 1000:
    x = rng.uniform(x0 + 100, x1 - 100); y = rng.uniform(y0 + 100, y1 - 100)
    if tree.query(Point(x, y).buffer(60)).size: continue
    s = stat(x, y)
    if s is not None: ctrl.append(s)
ctrl = np.array(ctrl); thr = float(np.percentile(ctrl, 95)); A_ = np.array(A_)
out = dict(flight='2019-09-27', gsd_m=0.6, n_points=int(len(A_)), controls=int(len(ctrl)), control_p95=round(thr, 2), visible_fraction=round(float((A_ >= thr).mean()), 3), visible_count=int((A_ >= thr).sum()),
           expected_false_alarms_among_points=round(0.05 * len(A_)), note='NIR is not used; luminance only; same definition as results/monuments.json')
json.dump(out, open(os.path.join(ROOT, 'docs', 'basemap1863', 'modern', 'results', 'monuments_0p6.json'), 'w'), indent=1)
print(out)
