"""Cleared corridors of mapped power lines through woodland (a modern landscape change: a line of missing canopy).

Canopy pixel = NDVI > 0.30, luminance < 100 and local luminance std (5x5) > 7 on the 1.0 m 2013 base (rule fixed here, checked by eye on crops in previews/corridor_*.jpg).
Every 30 m along each mapped power line a 120 m cross profile is read; the clear width is the contiguous non-canopy run through the centre (within 2 m of the line);
the sample 'passes through woodland' when both sides have >= 60 % canopy in the 10 m bands that start 3 m beyond the clear run. Per line: samples, median clear width.
Writes results/corridors.json and data/power_corridors.geojson.gz (buffered centre lines of the woodland stretches, WGS84).
"""
import os, sys, json, pickle, gzip, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio, cv2
from rasterio.windows import Window
from shapely.geometry import mapping, LineString
from shapely.ops import substring, unary_union
from vec_load import to_ll
import aoi_util as A
ROOT = A.ROOT
MOD = os.path.join(ROOT, 'tmp', 'b1863', 'modern'); WORK = os.path.join(MOD, 'work')
OUT = os.path.join(ROOT, 'docs', 'basemap1863', 'modern')
ds = rasterio.open(os.path.join(WORK, 'naip2013_1.0m.tif'))
recs = pickle.load(open(os.path.join(WORK, 'inventory_utm.pkl'), 'rb'))
x0, y1 = ds.bounds.left, ds.bounds.top
lines = [r for r in recs if r['cls'] == 'POWER_LINE' and r['geom'].geom_type in ('LineString', 'MultiLineString')]
res = []
polys = []
for r in lines:
    geoms = list(r['geom'].geoms) if r['geom'].geom_type == 'MultiLineString' else [r['geom']]
    widths, n_samples, woods_stretches = [], 0, []
    for g in geoms:
        n = int(g.length // 30)
        for i in range(n):
            s = substring(g, i * 30, (i + 1) * 30); m = s.interpolate(0.5, normalized=True)
            a = s.interpolate(0, normalized=True); b = s.interpolate(1, normalized=True)
            dx, dy = b.x - a.x, b.y - a.y; d = math.hypot(dx, dy)
            if d < 5: continue
            nx, ny = -dy / d, dx / d
            c = int(m.x - x0); rr = int(y1 - m.y)
            if c < 90 or rr < 90 or c + 90 >= ds.width or rr + 90 >= ds.height: continue
            a_ = ds.read(window=Window(c - 70, rr - 70, 141, 141)).astype(np.float32)
            lum = 0.299 * a_[0] + 0.587 * a_[1] + 0.114 * a_[2]; ndvi = (a_[3] - a_[0]) / (a_[3] + a_[0] + 1e-3)
            mu = cv2.blur(lum, (5, 5)); sd = np.sqrt(np.maximum(cv2.blur(lum * lum, (5, 5)) - mu * mu, 0))
            canopy = (ndvi > 0.30) & (lum < 100) & (sd > 7)
            offs = np.arange(-60, 61)
            px = np.clip((70 + nx * offs).round().astype(int), 0, 140); py = np.clip((70 - ny * offs).round().astype(int), 0, 140)
            prof = canopy[py, px]
            n_samples += 1
            ci = 60
            lo = ci
            while lo > 0 and not prof[lo - 1]: lo -= 1
            hi = ci
            while hi < 120 and not prof[hi + 1]: hi += 1
            if prof[ci - 2:ci + 3].all():
                continue          # canopy on the line itself: not a cleared corridor here
            L = prof[max(lo - 13, 0):max(lo - 3, 0)]; R = prof[min(hi + 3, 120):min(hi + 13, 121)]
            if L.size >= 8 and R.size >= 8 and L.mean() >= 0.6 and R.mean() >= 0.6:
                widths.append(hi - lo + 1); woods_stretches.append(s)
    if widths:
        res.append(dict(id=r['id'], srcid=r['srcid'], samples=n_samples, woodland_samples=len(widths), median_clear_width_m=float(np.median(widths)), p10=float(np.percentile(widths, 10)), p90=float(np.percentile(widths, 90)), woodland_length_m=len(widths) * 30))
        w = float(np.median(widths))
        polys.append(dict(type='Feature', properties=dict(id=r['id'].replace('POWER_LINE', 'POWER_ROW'), line=r['id'], width_m=round(w), length_m=len(widths) * 30, method='canopy-gap profile on NAIP 2013 1.0 m', error_m=2.0, confidence='Estimated'),
                          geometry=mapping(to_ll(unary_union([t.buffer(w / 2, cap_style=2) for t in woods_stretches])))))
tot = sum(x['woodland_length_m'] for x in res)
out = dict(lines_scanned=len(lines), lines_with_woodland_corridor=len(res), woodland_corridor_length_km=round(tot / 1000, 2),
           median_width_m_all=round(float(np.median([x['median_clear_width_m'] for x in res])), 1) if res else None,
           area_ha=round(sum(x['woodland_length_m'] * x['median_clear_width_m'] for x in res) / 1e4, 2), lines=res)
json.dump(out, open(os.path.join(OUT, 'results', 'corridors.json'), 'w'), indent=1)
with gzip.open(os.path.join(OUT, 'data', 'power_corridors.geojson.gz'), 'wt', encoding='utf8') as z:
    json.dump(dict(type='FeatureCollection', features=polys), z, separators=(',', ':'))
print({k: v for k, v in out.items() if k != 'lines'})
