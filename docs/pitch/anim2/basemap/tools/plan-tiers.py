"""Candidate tile sets and their priorities, from the real unit placements.  Writes tiers.json (read by build-assets.py, which cuts each ranked list at the byte budget).
 z13, z14   the whole bounding box
 z15        every tile within 2.0 km of any unit path / place mark, ranked by distance (outer ring is cut first)
 z16        every tile within 700 m of a unit path / place, ranked by a path-density score (hotspot tiles first)
 z17        tiles whose centre is within r of a hotspot (primary hotspots first)"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
d = json.load(open(os.path.join(ROOT, 'docs', 'pitch', 'anim', 'prototype', 'data', 'dataset.json'), encoding='utf8'))
plan = json.load(open(os.path.join(BASEMAP, 'plan.json'))); R = plan['z14Range']
hs = json.load(open(os.path.join(os.path.dirname(__file__), 'hotspots.json')))['hotspots']
K = 1 / math.cos(math.radians(39.81))                           # mercator metres per ground metre
pts, segs = [], []
for u in d['units']:
    prev = None
    for k in u['kf']:
        p = (k[2], k[1]); pts.append(p)
        if prev: segs.append((prev, p))
        prev = p
places = [(l['lng'], l['lat']) for l in d['terrain']['locations']] + [(l['productionLng'], l['productionLat']) for l in d['terrain']['locations']]
samples = []                                                    # (x, y merc, weight): keyframes weigh 3, path samples (150 m) weigh 1
for lng, lat in pts: samples.append((*lnglat_to_merc(lng, lat), 3.0))
for (a, b) in segs:
    dm = math.hypot((b[0] - a[0]) * 85400, (b[1] - a[1]) * 111195); n = max(1, int(dm / 150))
    for i in range(1, n): samples.append((*lnglat_to_merc(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n), 1.0))
for lng, lat in places: samples.append((*lnglat_to_merc(lng, lat), 2.0))
def tile_range(z):
    s = 2 ** (z - 14); return range(R['x0'] * s, (R['x1'] + 1) * s), range(R['y0'] * s, (R['y1'] + 1) * s)
def centre(z, x, y):
    b = tile_bounds_merc(z, x, y); return (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
out = {'z13': [], 'z14': [], 'z15': [], 'z16': [], 'z17': []}
for z in (13, 14):
    xs = range(R['x0'] // 2 ** (14 - z), R['x1'] // 2 ** (14 - z) + 1); ys = range(R['y0'] // 2 ** (14 - z), R['y1'] // 2 ** (14 - z) + 1)
    out[f'z{z}'] = [[x, y, 1e9] for y in ys for x in xs]
# density grid at z16 resolution (weights per tile) then smoothed over neighbours
xs16, ys16 = tile_range(16); dens = {}
span16 = TILE * mpp(16)
for x, y, w in samples:
    tx = int((x + ORIGIN) // span16); ty = int((ORIGIN - y) // span16); dens[(tx, ty)] = dens.get((tx, ty), 0) + w
def dist_to_samples(cx, cy, cap):
    best = 1e18
    for x, y, w in samples:
        dd = math.hypot(x - cx, y - cy)
        if dd < best: best = dd
    return best / K
# z15: nearest-sample distance per tile (grid-accelerated by using the z16 density cells)
cells = list(dens.keys())
def nearest_cell_dist(cx, cy):
    best = 1e18
    for (tx, ty) in cells:
        dd = math.hypot(tx * span16 - ORIGIN + span16 / 2 - cx, ORIGIN - ty * span16 - span16 / 2 - cy)
        if dd < best: best = dd
    return best / K
xs15, ys15 = tile_range(15)
for y in ys15:
    for x in xs15:
        cx, cy = centre(15, x, y); dd = nearest_cell_dist(cx, cy)
        if dd <= 2000: out['z15'].append([x, y, round(1e6 / (1 + dd), 1)])
# z16: smoothed density = own + 0.35 * 8 neighbours; hotspot tiles get +1e6
for y in ys16:
    for x in xs16:
        s = dens.get((x, y), 0) + 0.35 * sum(dens.get((x + i, y + j), 0) for i in (-1, 0, 1) for j in (-1, 0, 1) if i or j)
        cx, cy = centre(16, x, y); near = min((nearest_cell_dist(cx, cy),), default=0)
        hot = max((1e6 * (1 - math.hypot(cx - lnglat_to_merc(h['lng'], h['lat'])[0], cy - lnglat_to_merc(h['lng'], h['lat'])[1]) / K / (h['r'] + 900)) for h in hs if math.hypot(cx - lnglat_to_merc(h['lng'], h['lat'])[0], cy - lnglat_to_merc(h['lng'], h['lat'])[1]) / K < h['r'] + 900), default=0)
        if s > 0 or hot > 0: out['z16'].append([x, y, round(s + hot, 1)])
# z17: centre within r of a hotspot
xs17, ys17 = tile_range(17); span17 = TILE * mpp(17)
for h in hs:
    hx, hy = lnglat_to_merc(h['lng'], h['lat']); r = h['r'] * K
    for tx in range(int((hx - r + ORIGIN) // span17), int((hx + r + ORIGIN) // span17) + 1):
        for ty in range(int((ORIGIN - hy - r) // span17), int((ORIGIN - hy + r) // span17) + 1):
            cx, cy = centre(17, tx, ty)
            if math.hypot(cx - hx, cy - hy) <= r:
                pr = (1e6 if h.get('primary') else 1e5) * (1 - math.hypot(cx - hx, cy - hy) / r)
                ex = next((t for t in out['z17'] if t[0] == tx and t[1] == ty), None)
                if ex: ex[2] = max(ex[2], round(pr, 1))
                else: out['z17'].append([tx, ty, round(pr, 1)])
for k in out: out[k].sort(key=lambda t: -t[2])
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'tiers.json'), 'w'))
print({k: len(v) for k, v in out.items()})
