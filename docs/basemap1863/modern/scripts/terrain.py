"""Terrain changes of the modern surface that alter the 1863 ground: road cuts and fills, the quarry, engineered basins.
Source: USGS 3DEP 1 m DEM (lidar project PA_South_Central_B1_2017), tmp/b1863/modern/dem/dem_1m_utm18.tif (fetch_dem.py).

Method (every number below is computed here, nothing is asserted from memory):
  road cut/fill: along each mapped road (arterial and local classes, segments cut every 25 m) the road-bed height z0 is the median DEM on the centre line
  +-2 m; the undisturbed-ground estimate zi is the mean of the median DEM at +-25 m (+-3 m window) on the left and right, i.e. the straight line the
  ground would follow across the corridor. h = z0 - zi: negative = cut, positive = fill. This is an ESTIMATE: on a narrow spur or in a gully the
  straight line is wrong. Its noise floor is measured on random off-road lines (>= 80 m from any mapped road) with the same operator: sigma_noise.
  A 25 m stretch is a candidate if |h| >= max(1.5 m, 3 sigma_noise); runs of candidate stretches are merged along the road.
  quarry / basins: depth = median DEM of a 10-30 m ring outside the polygon minus the minimum inside (5th percentile inside).
Outputs: results/terrain_changes.json, data/terrain_candidates.geojson.gz (WGS84)
"""
import os, sys, json, pickle, gzip, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio
from shapely.geometry import LineString, Point, mapping, MultiLineString
from shapely.ops import substring, unary_union
from vec_load import to_ll
import aoi_util as A

ROOT = A.ROOT
MOD = os.path.join(ROOT, 'tmp', 'b1863', 'modern')
OUT = os.path.join(ROOT, 'docs', 'basemap1863', 'modern')
recs = pickle.load(open(os.path.join(MOD, 'work', 'inventory_utm.pkl'), 'rb'))
ds = rasterio.open(os.path.join(MOD, 'dem', 'dem_1m_utm18.tif'))
dem = ds.read(1).astype(np.float32)
dem[dem < -1000] = np.nan
x0, y1 = ds.bounds.left, ds.bounds.top
H, W = dem.shape


def zat(x, y, r=2):
    c = int(x - x0); rr = int(y1 - y)
    if r < 0 or rr - r < 0 or c - r < 0 or rr + r + 1 > H or c + r + 1 > W:
        return np.nan
    return float(np.nanmedian(dem[rr - r:rr + r + 1, c - r:c + r + 1]))


def profile(pt, nx, ny, off=25.0):
    """h at a point with unit normal (nx,ny)"""
    z0 = zat(pt[0], pt[1], 2)
    zl = zat(pt[0] + nx * off, pt[1] + ny * off, 3)
    zr = zat(pt[0] - nx * off, pt[1] - ny * off, 3)
    return z0 - 0.5 * (zl + zr), z0, zl, zr


def stretches(g, step=25.0):
    L = g.length
    n = int(L // step)
    out = []
    for i in range(n):
        s = substring(g, i * step, (i + 1) * step)
        mid = s.interpolate(0.5, normalized=True)
        a = s.interpolate(0.0, normalized=True); b = s.interpolate(1.0, normalized=True)
        dx, dy = b.x - a.x, b.y - a.y
        d = math.hypot(dx, dy)
        if d < 5:
            continue
        out.append((s, (mid.x, mid.y), (-dy / d, dx / d)))
    return out


roads = [r for r in recs if r['cls'] in ('ROAD_ARTERIAL', 'ROAD_LOCAL') and r['geom'].geom_type in ('LineString', 'MultiLineString')]
alll = [r['geom'] for r in recs if r['cls'] in ('ROAD_ARTERIAL', 'ROAD_LOCAL', 'ROAD_SERVICE', 'PATH', 'TRACK', 'RAIL', 'PARKING', 'BUILDING')]
mod_union = unary_union([g.buffer(80) for g in alll if g.geom_type in ('LineString', 'MultiLineString', 'Polygon', 'MultiPolygon')][:20000]) if False else None

# noise floor: same operator on random straight 25 m segments far from anything mapped (STRtree on buffered geometries)
from shapely.strtree import STRtree
tree = STRtree(alll)
rng = np.random.default_rng(1863)
noise = []
tries = 0
while len(noise) < 3000 and tries < 60000:
    tries += 1
    x = x0 + rng.uniform(100, W - 100); y = y1 - rng.uniform(100, H - 100)
    p = Point(x, y)
    if tree.query(p.buffer(80)).size:
        continue
    ang = rng.uniform(0, math.pi)
    nx, ny = math.cos(ang), math.sin(ang)
    h, *_ = profile((x, y), nx, ny)
    if not np.isnan(h):
        noise.append(h)
noise = np.array(noise)
sigma = float(np.std(noise)); mad_sigma = float(1.4826 * np.median(np.abs(noise - np.median(noise))))
thr = max(1.5, 3 * sigma)
print('noise sigma', sigma, 'mad sigma', mad_sigma, 'threshold', thr, 'n', len(noise), flush=True)

cands = []
tot_len = {}
for r in roads:
    geoms = list(r['geom'].geoms) if r['geom'].geom_type == 'MultiLineString' else [r['geom']]
    for g in geoms:
        if g.length < 60:
            continue
        run = []
        for s, mid, (nx, ny) in stretches(g):
            h, z0, zl, zr = profile(mid, nx, ny)
            tot_len[r['cls']] = tot_len.get(r['cls'], 0) + 25
            if np.isnan(h):
                continue
            if abs(h) >= thr:
                run.append((s, h))
            else:
                if len(run) >= 2:
                    cands.append((r, run))
                run = []
        if len(run) >= 2:
            cands.append((r, run))

feat = []
for i, (r, run) in enumerate(cands):
    hs = [h for _, h in run]
    geom = unary_union([s for s, _ in run])
    feat.append(dict(type='Feature', properties=dict(id=f'MOD-TERRAIN-{i + 1:04d}', kind='road_cut' if np.median(hs) < 0 else 'road_fill', road_class=r['cls'], road_src=r['src'], road_srcid=r['srcid'], name=r.get('name'),
                                                       length_m=round(sum(s.length for s, _ in run)), median_h_m=round(float(np.median(hs)), 1), max_abs_h_m=round(float(max(hs, key=abs)), 1),
                                                       method='3DEP 1 m DEM, cross-profile estimate (see terrain.py)', error_m=round(max(1.0, 2 * sigma), 1), confidence='Estimated'),
                     geometry=mapping(to_ll(geom))))
# polygons: quarry and engineered water
polys = []
for r in recs:
    if r['cls'] in ('QUARRY_LANDFILL', 'WATER_MODERN') and r['geom'].geom_type in ('Polygon', 'MultiPolygon') and r['geom'].area > 400:
        g = r['geom']
        ring = g.buffer(30).difference(g.buffer(10))
        from rasterio.features import geometry_mask
        tr = ds.transform
        b = ring.bounds
        c0, c1 = int(b[0] - x0) - 1, int(b[2] - x0) + 2
        r0, r1 = int(y1 - b[3]) - 1, int(y1 - b[1]) + 2
        if c0 < 0 or r0 < 0 or c1 > W or r1 > H:
            continue
        win = rasterio.windows.Window(c0, r0, c1 - c0, r1 - r0)
        sub = dem[r0:r1, c0:c1]
        wt = rasterio.windows.transform(win, tr)
        m_ring = ~geometry_mask([ring], out_shape=sub.shape, transform=wt)
        m_in = ~geometry_mask([g], out_shape=sub.shape, transform=wt)
        if m_ring.sum() < 10 or m_in.sum() < 10:
            continue
        rim = float(np.nanmedian(sub[m_ring])); lo = float(np.nanpercentile(sub[m_in], 5)); hi = float(np.nanpercentile(sub[m_in], 95))
        polys.append(dict(type='Feature', properties=dict(id=r['id'], kind=r['cls'].lower(), sub=r['sub'], area_ha=round(g.area / 1e4, 2), rim_m=round(rim, 1), p5_inside_m=round(lo, 1), p95_inside_m=round(hi, 1),
                                                           depth_m=round(rim - lo, 1), method='3DEP 1 m DEM ring (10-30 m) vs inside', error_m=1.0, confidence='Estimated'), geometry=mapping(to_ll(g))))
feat_all = feat + polys
with gzip.open(os.path.join(OUT, 'data', 'terrain_candidates.geojson.gz'), 'wt', encoding='utf8') as z:
    json.dump(dict(type='FeatureCollection', features=feat_all), z, separators=(',', ':'))
summary = dict(dem='USGS 3DEP 1 m, lidar project PA_South_Central_B1_2017 (identify on the 3DEPElevation ImageServer, see IMAGERY-CHOICE.md)',
               noise_sigma_m=round(sigma, 2), noise_mad_sigma_m=round(mad_sigma, 2), noise_n=int(len(noise)), threshold_m=round(thr, 2),
               road_length_scanned_km={k: round(v / 1000, 1) for k, v in tot_len.items()},
               road_candidates=len(feat), road_candidate_length_km=round(sum(f['properties']['length_m'] for f in feat) / 1000, 2),
               cuts=sum(1 for f in feat if f['properties']['kind'] == 'road_cut'), fills=sum(1 for f in feat if f['properties']['kind'] == 'road_fill'),
               by_road_class={c: sum(1 for f in feat if f['properties']['road_class'] == c) for c in ('ROAD_ARTERIAL', 'ROAD_LOCAL')},
               polygons=[f['properties'] for f in polys],
               top_road_candidates=sorted([f['properties'] for f in feat], key=lambda p: -abs(p['median_h_m']) * p['length_m'])[:25],
               caveat='1863 ground under these features is not recoverable from the modern DEM alone: h is a straight-line estimate across the corridor; a period source (HABS drawings, NPS cultural landscape report, 1860s contour map) is needed to confirm. Not applied to the imagery.')
json.dump(summary, open(os.path.join(OUT, 'results', 'terrain_changes.json'), 'w', encoding='utf8'), indent=1)
print(json.dumps({k: v for k, v in summary.items() if k not in ('polygons', 'top_road_candidates')}, indent=1))
for p in summary['top_road_candidates'][:10]:
    print(p)
