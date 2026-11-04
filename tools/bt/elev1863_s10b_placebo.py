"""Placebo test for the de-modernization edit rule: shift every candidate polygon 250-450 m in a random direction (so it no longer sits on the
documented disturbance), apply the identical rule, and report how often it would 'edit'.  This is the false-positive rate of the rule:
the share of ordinary ground whose local contrast against its surroundings passes the 2.5 m / 65 percent test.
Writes placebo_test.json.  Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s10b_placebo.py
"""
import os
import sys
import json
import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_origin
from scipy import ndimage as ndi
import shapely.affinity as sa
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import elev1863_s10_polygons as S10

dem = rasterio.open(C.DEM).read(1).astype(np.float32)
tin = rasterio.open(os.path.join(C.OUT, 'warren_tin_1863.tif')).read(1)
valid = tin > -9000
res = np.where(valid, tin - dem, np.nan).astype(np.float32)
H, W = dem.shape
cands, _ = S10.load_candidates()
rng = np.random.RandomState(11)
rows = []
for rep in range(3):
    for c in cands:
        ang = rng.uniform(0, 2 * np.pi)
        d = rng.uniform(250, 450)
        g = sa.translate(c['geom'], d * np.cos(ang), d * np.sin(ang))
        minx, miny, maxx, maxy = g.bounds
        c0, c1 = max(0, int(minx - C.DEM_X0) - 2), min(W, int(maxx - C.DEM_X0) + 3)
        r0, r1 = max(0, int(C.DEM_Y0 - maxy) - 2), min(H, int(C.DEM_Y0 - miny) + 3)
        if c1 <= c0 or r1 <= r0:
            continue
        tf = from_origin(C.DEM_X0 + c0, C.DEM_Y0 - r0, 1.0, 1.0)
        m = rasterize([(g, 1)], out_shape=(r1 - r0, c1 - c0), transform=tf, fill=0, dtype='uint8').astype(bool)
        v = valid[r0:r1, c0:c1] & m
        if v.sum() < S10.MIN_CELLS:
            continue
        pad = 150
        a0, a1, b0, b1 = max(0, r0 - pad), min(H, r1 + pad), max(0, c0 - pad), min(W, c1 + pad)
        mm = np.zeros((a1 - a0, b1 - b0), bool)
        mm[r0 - a0:r1 - a0, c0 - b0:c1 - b0] = m
        dd = ndi.distance_transform_edt(~mm)
        ring = (dd > 50) & (dd <= 150) & valid[a0:a1, b0:b1]
        if ring.sum() < S10.MIN_CELLS:
            continue
        r = res[r0:r1, c0:c1][v]
        rmed = float(np.median(res[a0:a1, b0:b1][ring]))
        contrast = float(np.median(r)) - rmed
        ss = float((np.sign(r - rmed) == np.sign(contrast)).mean())
        rows.append({'kind': c['kind'], 'contrast': contrast, 'n_in': int(v.sum()), 'same_side': ss, 'pass': bool(abs(contrast) >= S10.MIN_MED and ss >= S10.MIN_SIGN)})
out = {'what': 'false-positive rate of the edit rule on polygons shifted 250-450 m off the documented disturbance (3 random shifts per candidate)',
       'n_tested': len(rows), 'n_pass': int(sum(r['pass'] for r in rows)), 'false_positive_rate': float(np.mean([r['pass'] for r in rows])) if rows else None,
       'by_kind': {}}
for k in sorted(set(r['kind'] for r in rows)):
    rr = [r for r in rows if r['kind'] == k]
    out['by_kind'][k] = {'n': len(rr), 'pass_rate': float(np.mean([r['pass'] for r in rr])), 'median_abs_contrast_m': float(np.median([abs(r['contrast']) for r in rr]))}
out['abs_contrast_percentiles_m'] = {str(q): float(np.percentile([abs(r['contrast']) for r in rows], q)) for q in (50, 75, 90, 95, 99)}
json.dump(out, open(os.path.join(C.OUT, 'placebo_test.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
