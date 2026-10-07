"""Where are the hills and the Peach Orchard crossroads on the ground, compared with where the site's place marks put them?
 - summits: the highest point of the 3DEP DEM (z15 grid, smoothed 2 px = 3.7 m) within a search radius of a reference coordinate
 - the Peach Orchard crossroads: the intersection of the TIGER centre lines of Emmitsburg Rd and Wheatfield Rd
and, for each, the distance from the site's legacy-frame mark, the site's production-frame mark, and Wikipedia's coordinate where one exists.
Output: results/ground-truth.json and a printout.   Usage: python ground-truth.py"""
import json, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from common import *
from terrain import smooth
from dem import DemMosaic
import numpy as np

HERE = os.path.dirname(__file__)
ds = json.load(open(os.path.join(ROOT, 'docs', 'pitch', 'anim', 'prototype', 'data', 'dataset.json'), encoding='utf8'))['terrain']
loc = {l['name']: l for l in ds['locations']}
wiki = {k: json.load(open(os.path.join(CACHE, 'wiki', f), encoding='utf8')) for k, f in (('Little Round Top', 'Little_Round_Top.json'), ('Big Round Top', 'Big_Round_Top.json'), ("Culp's Hill", 'Culp%27s_Hill.json'))}
m15 = DemMosaic(15, 14)


def dist(a, b):
    return math.hypot((a[0] - b[0]) * 85400, (a[1] - b[1]) * 111195)          # (lng, lat) pairs, metres


def pix_to_ll(X, Y):                                                          # global z15-grid pixel -> lng, lat
    return merc_to_lnglat(X * mpp(15) - ORIGIN, ORIGIN - Y * mpp(15))


def summit(lng, lat, radius_m):
    wx, wy = world_px(lng, lat, 15)
    r = int(radius_m / (mpp(15) * math.cos(math.radians(lat))))
    X0, Y0 = int(wx) - r, int(wy) - r
    d = smooth(m15.window(X0, Y0, 2 * r + 1, 2 * r + 1), 2.0)
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    d = np.where(xx ** 2 + yy ** 2 <= r * r, d, -1e9)
    iy, ix = np.unravel_index(np.argmax(d), d.shape)
    lng2, lat2 = pix_to_ll(X0 + ix + 0.5, Y0 + iy + 0.5)
    return lng2, lat2, float(d[iy, ix])


rows = []
for name, wname, radius in (('Little Round Top', 'Little Round Top', 350), ('Big Round Top', 'Big Round Top', 350), ("Culp's Hill", "Culp's Hill", 350)):
    l = loc[name]
    w = wiki[wname]['coordinates']
    ref = (w['lon'], w['lat'])
    s_lng, s_lat, elev = summit(ref[0], ref[1], radius)
    rows.append(dict(name=name, kind='summit (DEM maximum within %d m of the Wikipedia coordinate)' % radius, truth=dict(lng=s_lng, lat=s_lat, elev_m=round(elev, 1)),
                     legacy_err_m=round(dist((l['lng'], l['lat']), (s_lng, s_lat)), 1), production_err_m=round(dist((l['productionLng'], l['productionLat']), (s_lng, s_lat)), 1),
                     wikipedia_err_m=round(dist(ref, (s_lng, s_lat)), 1)))
# Cemetery Hill: the crest north of the cemetery: search around the production mark
l = loc['Cemetery Hill']
s_lng, s_lat, elev = summit(l['productionLng'], l['productionLat'], 300)
rows.append(dict(name='Cemetery Hill', kind='crest (DEM maximum within 300 m of the production mark)', truth=dict(lng=s_lng, lat=s_lat, elev_m=round(elev, 1)),
                 legacy_err_m=round(dist((l['lng'], l['lat']), (s_lng, s_lat)), 1), production_err_m=round(dist((l['productionLng'], l['productionLat']), (s_lng, s_lat)), 1)))


# the Peach Orchard crossroads from TIGER centre lines
def lines(name, fc):
    out = []
    for f in json.load(open(os.path.join(CACHE, 'tiger', fc + '.geojson'), encoding='utf8'))['features']:
        if (f['properties'].get('NAME') or '') == name:
            out += [f['geometry']['coordinates']]
    return out


def seg_int(p, q, r, s):
    d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0])
    if abs(d) < 1e-15:
        return None
    t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d
    u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d
    return (p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])) if 0 <= t <= 1 and 0 <= u <= 1 else None


A, B = lines('Emmitsburg Rd', 'secondary'), lines('Wheatfield Rd', 'local')
hits = []
for a in A:
    for b in B:
        for i in range(len(a) - 1):
            for j in range(len(b) - 1):
                h = seg_int(a[i], a[i + 1], b[j], b[j + 1])
                if h: hits.append(h)
l = loc['Peach Orchard']
if hits:
    h = min(hits, key=lambda h: dist(h, (l['productionLng'], l['productionLat'])))
    rows.append(dict(name='Peach Orchard', kind='crossroads: TIGER centre lines of Emmitsburg Rd x Wheatfield Rd', truth=dict(lng=h[0], lat=h[1]),
                     legacy_err_m=round(dist((l['lng'], l['lat']), h), 1), production_err_m=round(dist((l['productionLng'], l['productionLat']), h), 1)))
for r in rows:
    print(r)
os.makedirs(os.path.join(HERE, 'results'), exist_ok=True)
json.dump(rows, open(os.path.join(HERE, 'results', 'ground-truth.json'), 'w'), indent=1)
# the three hills the DEM places elsewhere than the site does go to ../data/ground-truth.json, where build-vectors.py reads them as the 'ground' frame of the place marks
gt = {}
for r in rows:
    if r['name'] in ('Little Round Top', 'Big Round Top', "Culp's Hill"):
        gt[loc[r['name']]['id']] = dict(lng=round(r['truth']['lng'], 6), lat=round(r['truth']['lat'], 6),
                                        basis='Measured: highest point of the USGS 3DEP DEM within 350 m of the Wikipedia coordinate (elevation %.1f m); verify/ground-truth.py' % r['truth']['elev_m'])
json.dump(dict(sorted(gt.items())), open(os.path.join(HERE, '..', 'data', 'ground-truth.json'), 'w'), indent=1)
