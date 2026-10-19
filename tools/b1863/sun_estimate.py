"""Estimate the cast-shadow direction and length of the NAIP 2013-06-04 mosaic from the 2017 lidar canopy height model (2 m cells) and the photograph.
For isolated tall trees (CHM > 12 m, few canopy cells around) the mean luminance of ground at p + d*(cos t, sin t) is lowest in the shadow direction t.
Result: tmp/b1863/build/sun.json (shadow azimuth as map direction, shadow length per metre of height)."""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from scipy import ndimage as ndi
import rasterio
from rasterio.windows import Window

d = np.load(os.path.join(C.ROOT, 'tmp', 'b1863', 'landcover', 'chm_final.npz'))
chm = d['chm']
X0c, Y1c, R = 303000.0, 4416200.0, 2.0
# study window: open farmland west of the Peach Orchard to Big Round Top, 3 km square
x0, y1 = 305000.0, 4411000.0; S = 3000
ci, ri = int((x0 - X0c) / R), int((Y1c - y1) / R)
sub = chm[ri:ri + S // 2, ci:ci + S // 2]
c0, r0 = int(x0 - C.X0), int(C.Y0 - y1)
with rasterio.open(C.BASE_TIF) as ds:
    rgb = ds.read([1, 2, 3], window=Window(c0, r0, S, S)).astype(np.float32)
lum = rgb.mean(0)
lum1 = ndi.gaussian_filter(lum, 1.0)
tall = sub > 12
dens = ndi.uniform_filter((sub > 4).astype(np.float32), 15)
iso = tall & (dens < 0.25)
ys, xs = np.nonzero(iso)
print('isolated tall cells', len(ys))
py = (ys * 2 + 1); px = (xs * 2 + 1)
ok = (py > 40) & (py < S - 40) & (px > 40) & (px < S - 40)
py, px = py[ok], px[ok]
h = sub[ys[ok], xs[ok]]
res = {}
best = None
for dist in (6, 10, 14):
    row = []
    for th in range(0, 360, 10):
        t = np.deg2rad(th)
        qx = (px + dist * np.cos(t)).astype(int); qy = (py - dist * np.sin(t)).astype(int)   # th measured east-counterclockwise (map frame, y up)
        row.append(float(lum1[qy, qx].mean()))
    res[dist] = row
    print(dist, 'min at', int(np.argmin(row)) * 10, 'deg (E ccw)', 'min %.1f max %.1f' % (min(row), max(row)))
ang = np.mean([np.argmin(res[k]) * 10 for k in res])
# length: along the best direction, find the distance where mean luminance recovers to the opposite side's value
t = np.deg2rad(int(np.argmin(res[10])) * 10)
prof = []
for dist in range(2, 30, 2):
    qx = (px + dist * np.cos(t)).astype(int); qy = (py - dist * np.sin(t)).astype(int)
    qx2 = (px - dist * np.cos(t)).astype(int); qy2 = (py + dist * np.sin(t)).astype(int)
    prof.append((dist, float(lum1[qy, qx].mean() - lum1[qy2, qx2].mean())))
print('shadow minus opposite luminance by distance', prof)
out = dict(n_trees=int(len(py)), mean_height_m=float(h.mean()), shadow_dir_deg_east_ccw=int(np.argmin(res[10])) * 10, curves=res, profile=prof)
json.dump(out, open(os.path.join(C.BUILD, 'sun.json'), 'w'), indent=1)
