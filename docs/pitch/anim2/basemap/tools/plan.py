"""Compute the bounding box and the tier plan (which tiles exist at which zoom) from the prototype's real placement data.
Output: ../plan.json (committed; every later step reads it).  Run: python plan.py"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
DATA = os.path.join(ROOT, 'docs', 'pitch', 'anim', 'prototype', 'data', 'dataset.json')
d = json.load(open(DATA, encoding='utf8'))
pts = []                                   # (lng, lat) of every unit keyframe: kf = [tick, lat, lng, ...]
segs = []
for u in d['units']:
    prev = None
    for k in u['kf']:
        p = (k[2], k[1]); pts.append(p)
        if prev: segs.append((prev, p))
        prev = p
places = []
for l in d['terrain']['locations']:
    places.append((l['lng'], l['lat'])); places.append((l['productionLng'], l['productionLat']))
for l in d['terrain']['features'] + d['terrain']['structures']:
    places.append((l['lng'], l['lat']))
allp = pts + places
lo = (min(p[0] for p in allp), min(p[1] for p in allp)); hi = (max(p[0] for p in allp), max(p[1] for p in allp))
MARGIN_M = 1200.0
def pad(lng, lat, dx, dy):
    x, y = lnglat_to_merc(lng, lat); return merc_to_lnglat(x + dx, y + dy)
bb_sw = pad(lo[0], lo[1], -MARGIN_M / math.cos(math.radians(39.81)), -MARGIN_M / math.cos(math.radians(39.81)))   # mercator metres are stretched by 1/cos(lat)
bb_ne = pad(hi[0], hi[1], MARGIN_M / math.cos(math.radians(39.81)), MARGIN_M / math.cos(math.radians(39.81)))
x0, y0 = lnglat_to_merc(*bb_sw); x1, y1 = lnglat_to_merc(*bb_ne)
# snap to the z14 tile grid (a z14 tile is 512 px = 1.88 km at z14); everything at every level is then a whole number of tiles
def snap(zz):
    span = TILE * mpp(zz)
    return (math.floor((x0 + ORIGIN) / span), math.floor((ORIGIN - y1) / span), math.ceil((x1 + ORIGIN) / span) - 1, math.ceil((ORIGIN - y0) / span) - 1)
c14 = snap(14)
plan = dict(
    sourceExtent=dict(lngMin=lo[0], latMin=lo[1], lngMax=hi[0], latMax=hi[1], keyframes=len(pts), places=len(places)),
    marginM=MARGIN_M, z14Range=dict(x0=c14[0], y0=c14[1], x1=c14[2], y1=c14[3]))
def tiles_within(points, z, radius_m):
    """z tiles whose centre lies within radius_m (ground metres) of any point. Mercator-corrected."""
    span = TILE * mpp(z); out = set()
    k = 1 / math.cos(math.radians(39.81))                   # mercator metres per ground metre
    r = radius_m * k
    for lng, lat in points:
        x, y = lnglat_to_merc(lng, lat)
        for tx in range(math.floor((x - r + ORIGIN) / span), math.floor((x + r + ORIGIN) / span) + 1):
            for ty in range(math.floor((ORIGIN - y - r) / span), math.floor((ORIGIN - y + r) / span) + 1):
                out.add((tx, ty))
    return out
def sample_segments(maxstep_m=150):
    out = []
    for a, b in segs:
        dm = math.hypot((b[0] - a[0]) * 85400, (b[1] - a[1]) * 111195)
        n = max(1, int(dm / maxstep_m))
        for i in range(n + 1): out.append((a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n))
    return out
path_pts = sample_segments() + pts + places
print('keyframes', len(pts), 'segments', len(segs), 'path samples', len(path_pts))
print('bbox lng/lat', [round(v, 5) for v in (*bb_sw, *bb_ne)], 'z14 tiles', c14, 'count', (c14[2] - c14[0] + 1) * (c14[3] - c14[1] + 1))
for z, r in ((16, 300), (16, 500), (16, 800), (17, 150), (17, 250)):
    t = tiles_within(path_pts, z, r)
    print(f'z{z} tiles within {r} m of any unit path: {len(t)}  ({len(t) * (TILE * mpp(z) * math.cos(math.radians(39.81))) ** 2 / 1e6:.1f} km2)')
tw = lambda z: ((c14[2] - c14[0] + 1) * 2 ** (z - 14)) * ((c14[3] - c14[1] + 1) * 2 ** (z - 14))
print('whole bbox tile counts:', {z: tw(z) for z in range(13, 18)})
json.dump(plan, open(os.path.join(BASEMAP, 'plan.json'), 'w'), indent=1)
