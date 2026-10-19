"""How many of the listed monument points can be seen in the 1.0 m 2013 image, and how far is the visible object from the listed coordinate?

For each monument point: luminance anomaly A = max |lum - median(ring)| / (1.4826 MAD(ring)) inside a 3.5 m radius disc (ring = 8..20 m, with other mapped features masked out).
The position of that maximum relative to the listed point is the offset. The same statistic is computed for 3000 random open-ground points (>= 60 m from any
mapped modern feature): that is the false-alarm rate. A monument counts as 'visible' when A >= the 95th percentile of the random points.
At 1 m ground resolution most markers (tablets, 0.5-1 m) are sub-pixel and cannot be seen; the large state monuments can. Writes results/monuments.json.
"""
import os, sys, json, pickle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio, cv2
from rasterio.windows import Window
import aoi_util as A
ROOT = A.ROOT
MOD = os.path.join(ROOT, 'tmp', 'b1863', 'modern'); WORK = os.path.join(MOD, 'work')
ds = rasterio.open(os.path.join(WORK, 'naip2013_1.0m.tif'))
dm = rasterio.open(os.path.join(WORK, 'removal_mask_1m.tif')) if os.path.exists(os.path.join(WORK, 'removal_mask_1m.tif')) else None
recs = pickle.load(open(os.path.join(WORK, 'inventory_utm.pkl'), 'rb'))
x0, y1 = ds.bounds.left, ds.bounds.top
mons = [r for r in recs if r['cls'] == 'MONUMENT']
H = 24
yy, xx = np.mgrid[-H:H + 1, -H:H + 1]
d = np.hypot(yy, xx)
disc = d <= 3.5
ring = (d >= 8) & (d <= 20)


def stat(x, y, mask_other=None):
    c = int(x - x0); r = int(y1 - y)
    if c - H < 0 or r - H < 0 or c + H + 1 > ds.width or r + H + 1 > ds.height:
        return None
    a = ds.read([1, 2, 3], window=Window(c - H, r - H, 2 * H + 1, 2 * H + 1)).astype(np.float32)
    lum = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]
    rg = ring.copy()
    if mask_other is not None:
        rg &= ~mask_other
    if rg.sum() < 60:
        return None
    med = np.median(lum[rg]); mad = 1.4826 * np.median(np.abs(lum[rg] - med)) + 1.0
    z = np.abs(lum - med) / mad
    zz = np.where(disc, z, -1)
    k = np.unravel_index(np.argmax(zz), zz.shape)
    return float(zz[k]), float(np.hypot(k[0] - H, k[1] - H))


mon = []
for r in mons:
    g = r['geom'].centroid
    s = stat(g.x, g.y)
    if s:
        mon.append((r['src'], r['sub'], s[0], s[1]))
rng = np.random.default_rng(3)
from shapely.strtree import STRtree
tree = STRtree([r['geom'] for r in recs if r['cls'] in ('ROAD_ARTERIAL', 'ROAD_LOCAL', 'ROAD_SERVICE', 'PATH', 'BUILDING', 'PARKING', 'MONUMENT', 'POWER_SUPPORT', 'FENCE_WALL')])
from shapely.geometry import Point
ctrl = []
while len(ctrl) < 3000:
    x = x0 + rng.uniform(100, ds.width - 100); y = y1 - rng.uniform(100, ds.height - 100)
    if tree.query(Point(x, y).buffer(60)).size:
        continue
    s = stat(x, y)
    if s:
        ctrl.append(s[0])
ctrl = np.array(ctrl); thr = float(np.percentile(ctrl, 95))
A_ = np.array([m[2] for m in mon]); OFF = np.array([m[3] for m in mon])
vis = A_ >= thr
out = dict(n_points=len(mon), control_points=len(ctrl), control_anomaly_p50=round(float(np.median(ctrl)), 2), control_anomaly_p95=round(thr, 2),
           visible_fraction=round(float(vis.mean()), 3), visible_count=int(vis.sum()),
           offset_of_peak_m_median_visible=round(float(np.median(OFF[vis])), 2) if vis.any() else None, offset_p90_visible=round(float(np.percentile(OFF[vis], 90)), 2) if vis.any() else None,
           by_source={s: dict(n=int(sum(1 for m in mon if m[0] == s)), visible_fraction=round(float(np.mean([m[2] >= thr for m in mon if m[0] == s])), 3)) for s in sorted({m[0] for m in mon})},
           note='An anomaly above the control 95th percentile means something in the 3.5 m disc stands out from the ground around it; it does not prove it is the monument. The false-alarm rate is 5 percent by construction. Markers of 1 m or less are not resolvable at 1.0 m.')
json.dump(out, open(os.path.join(ROOT, 'docs', 'basemap1863', 'modern', 'results', 'monuments.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
