"""Eight verification passes on the land-cover reconstruction. Writes docs/.../landcover/VERIFICATION-landcover.json"""
import json, os, sys, hashlib, subprocess
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from shapely.geometry import shape, Point
from shapely.ops import transform as st, unary_union
from pyproj import Transformer
from scipy import ndimage as ndi
import warp, chamfer3
from rasterize import rasterize, X0, Y1
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
D = os.path.normpath(os.path.join(ROOT, '..', '..', '..', 'docs', 'basemap1863', 'features', 'landcover'))
L2U = Transformer.from_crs(4326, 32618, always_xy=True)
def load(name):
    fc = json.load(open(os.path.join(D, name + '.geojson')))
    return fc, [st(lambda x, y, z=None: L2U.transform(x, y), shape(f['geometry'])) for f in fc['features']]
R = {}
# ---- pass 1: georeference residuals against TIGER centrelines (not independent: used to fit)
E, N = chamfer3.pts[:, 0], chamfer3.pts[:, 1]
for ffd in (False, True):
    x, y = warp.utm_to_px(E, N, use_ffd=ffd); ok = (x > 5) & (x < 8870) & (y > 5) & (y < 9840)
    v = ndi.map_coordinates(chamfer3.dt, [y[ok] * 0.5, x[ok] * 0.5], order=1) * 2 * 1.004
    R['p1_tiger_fit_ffd' if ffd else 'p1_tiger_fit_similarity'] = {'n_points': int(ok.sum()), 'median_m': round(float(np.median(v)), 1), 'p75_m': round(float(np.percentile(v, 75)), 1), 'frac_within_5m': round(float((v <= 5).mean()), 2), 'note': 'distance from modern TIGER road points to nearest Warren ink pixel (capped 15 px at half scale); fitted data, so optimistic; roads also moved since 1863'}
# ---- pass 2: independent GCPs of the maps agent (docs/basemap1863/maps/gcps/warren.json)
try:
    g = json.load(open(os.path.join(ROOT, '..', '..', '..', 'docs', 'basemap1863', 'maps', 'gcps', 'warren.json')))
    errs = []
    for q in g['gcps']:
        e, n = warp.px_to_utm(q['px'][0], q['px'][1]); errs.append((q['id'], q['kind'], float(np.hypot(e - q['en'][0], n - q['en'][1]))))
    allv = np.array([e[2] for e in errs]); road = np.array([e[2] for e in errs if e[1] in ('road-junction', 'bridge')]); bld = np.array([e[2] for e in errs if e[1] == 'farm-building'])
    R['p2_independent_gcps'] = {'n': len(errs), 'median_m': round(float(np.median(allv)), 1), 'p90_m': round(float(np.percentile(allv, 90)), 1), 'max_m': round(float(allv.max()), 1),
        'roads_bridges_median_m': round(float(np.median(road)), 1), 'farm_buildings_median_m': round(float(np.median(bld)), 1),
        'note': 'GCPs were picked by another agent from different features (summits, junctions, buildings) and not used in my fit. A 25 to 30 m median disagreement means either my transform, their GCP picks, or both carry errors of that size; unresolved. Stated positional error of the land-cover polygons is therefore 30 to 40 m, not the 1.4 m of pass 1.'}
except Exception as ex:
    R['p2_independent_gcps'] = {'error': str(ex)}
# ---- pass 3: terrain registration (Warren ink density vs lidar slope), independent of roads
R['p3_terrain_registration'] = json.load(open(os.path.join(ROOT, 'v3_terrain_registration.json')))
R['p3_terrain_registration']['note'] = 'Local best shifts of the Warren sheet (3 km windows, 10 m steps, +-60 m) against slope from 3DEP lidar; windows with NCC>0.28 only; the NCC is weak (peak about 0.3 to 0.47) so this indicates the local error scale (about 20 m), not a correction.'
# ---- pass 4: lidar canopy vs mapped 1863 woods (persistence)
d = np.load(os.path.join(ROOT, 'chm_final.npz')); chm = d['chm']; mf = d['mf']
raw = ((chm > 4) & (mf > 0.08)).astype(np.uint8); can = (cv2.boxFilter(raw.astype(np.float32), -1, (5, 5), normalize=False) >= 4).astype(np.uint8)
fw, gw = load('woods_1863'); fo, go = load('orchards_1863'); fs, gs = load('scattered_trees_1863'); fm, gm = load('marsh_wetland_1863')
cover = load('coverage_warren_sheet')[1][0]
w = rasterize(gw).astype(np.uint8); o = rasterize(go).astype(np.uint8); s = rasterize(gs).astype(np.uint8); mm = rasterize(gm).astype(np.uint8)
town = load('excluded_town_zone')[1][0]; tw = rasterize([town]).astype(np.uint8); cv_ = rasterize([cover]).astype(np.uint8)
we = cv2.erode(w, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
outside = cv_ & (1 - cv2.dilate(w | o | s, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))) & (1 - tw)
R['p4_canopy_persistence'] = {'woods_interior_cells_ha': round(float(we.sum() * 4 / 1e4), 1), 'modern_canopy_in_woods_interior': round(float(can[we > 0].mean()), 3), 'modern_canopy_in_orchard_polys': round(float(can[o > 0].mean()), 3),
    'modern_canopy_outside_all_1863_tree_polys_excl_town': round(float(can[outside > 0].mean()), 3), 'modern_canopy_frac_of_sheet': round(float(can[cv_ > 0].mean()), 3),
    'note': 'If the mapped 1863 woods are right, most of their interior should carry canopy today (woods persist); open 1863 ground should carry little. This tests the extraction, not the 1863 truth.'}
# ---- pass 5: NAIP 2022-04 (leaf-off) greenness and texture inside classes vs open ground
m = np.load(os.path.join(ROOT, 'naip_mosaic.npy'), mmap_mode='r')
def naip_stats(mask, step=8):
    ys, xs = np.where(mask[::2, ::2] > 0)   # 4 m sampling of the 2 m mask
    sel = np.random.RandomState(0).choice(len(ys), min(20000, len(ys)), replace=False); ys, xs = ys[sel] * 2, xs[sel] * 2
    py = (ys * 2).astype(int); px = (xs * 2).astype(int)
    vals = np.array([m[min(a, 11999), min(b, 11499)] for a, b in zip(py, px)], float)
    Rr, Gg, Bb, Nn = vals.T
    return {'ndvi_mean': round(float(((Nn - Rr) / (Nn + Rr + 1e-6)).mean()), 3), 'brightness_mean': round(float(((Rr + Gg + Bb) / 3).mean()), 1)}
og = rasterize(load('open_ground_1863')[1]).astype(np.uint8)
R['p5_naip_2022_04_leafoff_check'] = {'woods': naip_stats(we), 'open_ground_1863': naip_stats(og), 'note': 'April-2022 NAIP is leaf-off/leaf-emerging: woods read lower NDVI than green spring pasture and darker. A clear woods vs open contrast supports the polygons were not drawn on open fields; the exact values are not a pass/fail threshold.'}
# ---- pass 6: named landmarks (coordinates from NPS/commonly published positions; checks my reading, not a source)
LM = {'Culps Hill summit (woods expected)': (39.8167, -77.2183, True), 'Big Round Top summit (woods expected)': (39.7864, -77.2378, True), 'Peach Orchard (orchard expected)': (39.8010, -77.2500, 'orch'),
      'Wheatfield centre (open field expected, not woods)': (39.7957, -77.2423, False), 'Little Round Top summit (cleared / not woods expected)': (39.7907, -77.2396, False),
      'Cemetery Hill (not woods)': (39.8190, -77.2310, False), 'Herbst Woods (woods expected)': (39.8337, -77.2520, True)}
pr = {}
for k, (lat, lon, exp) in LM.items():
    E, N = L2U.transform(lon, lat); P = Point(E, N); inw = any(g.contains(P) for g in gw); ino = any(g.contains(P) for g in go); near = min(g.distance(P) for g in gw)
    pr[k] = {'in_woods': bool(inw), 'in_orchard': bool(ino), 'distance_to_nearest_wood_m': round(float(near), 0), 'expected': exp, 'agrees': (inw if exp is True else (ino if exp == 'orch' else not inw))}
R['p6_landmarks'] = pr
# ---- pass 7: schema, geometry validity, uniqueness, sources
req = ['id', 'category', 'subtype', 'name', 'present_1863', 'period_note', 'sources', 'method', 'positional_error_m', 'confidence', 'notes']
bad = []; ids = set(); tot = 0; invalid = 0; types = {}
for fn in sorted(os.listdir(D)):
    if fn.endswith('.geojson') and '.3857' not in fn:
        fc = json.load(open(os.path.join(D, fn)))
        for f in fc['features']:
            tot += 1; p = f['properties']
            miss = [k for k in req if k not in p]
            if miss: bad.append((f['id'], miss))
            if f['id'] in ids: bad.append((f['id'], 'dup'))
            ids.add(f['id'])
            if p['confidence'] not in ('Documented', 'Estimated', 'Contested', 'Unknown'): bad.append((f['id'], 'confidence'))
            for sr in p['sources']:
                for k in ('cite', 'sheet_or_page', 'url', 'type', 'quote_or_paraphrase'):
                    if k not in sr: bad.append((f['id'], 'source-' + k))
                types[sr['type']] = types.get(sr['type'], 0) + 1
            if not shape(f['geometry']).is_valid: invalid += 1
total_mb = sum(os.path.getsize(os.path.join(D, f)) for f in os.listdir(D)) / 1e6
R['p7_schema'] = {'features': tot, 'schema_problems': len(bad), 'first_problems': bad[:5], 'invalid_geometries': invalid, 'source_type_counts': types, 'directory_mb': round(total_mb, 1)}
# ---- pass 8: determinism
def hashes():
    return {f: hashlib.sha256(open(os.path.join(D, f), 'rb').read()).hexdigest()[:16] for f in sorted(os.listdir(D)) if f.endswith('.geojson')}
h1 = hashes()
subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'final_build.py')], capture_output=True)
h2 = hashes()
R['p8_rebuild_identical'] = {'files': len(h1), 'identical': h1 == h2, 'differing': [k for k in h1 if h1[k] != h2.get(k)]}
json.dump(R, open(os.path.join(D, 'VERIFICATION-landcover.json'), 'w'), indent=1)
print(json.dumps(R, indent=1))
