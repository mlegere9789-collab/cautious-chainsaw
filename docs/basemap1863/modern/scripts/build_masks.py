"""Build the removal masks from the vector inventory plus the pixel detector, on the 1.0 m grid of the 2013 base.

Raster values (uint8) of work/removal_mask_1m.tif:
  0 nothing
  1 ROAD_SURFACE      paved road, drive, path, parking, runway, rail bed surface (detector pavement inside the mapped corridor, plus the mapped centre-line core where the pixel is not vegetated)
  2 BUILDING          roof (detector inside / near a mapped outline, plus the outline dilated 1.5 m when the roof is visible in the 2013 image) and its cast shadow
  3 MONUMENT          disc of 2.5 m radius at each monument/marker point
  4 UTILITY           pole, pylon, tower, mast, flagpole, sign, lamp, signal, tank, silo (disc 1.5 m) and power-line centre lines (2 m)
  5 AREA_RETEXTURE    polygons that must be re-textured with 1863 land cover, not patch-filled: golf, sports and recreation, airfield, solar and substation, developed land
  6 DETECTED_UNMAPPED paved or roofed surface found by the detector with no mapped feature within 12 m (>= 60 m2)
  7 WATER_MODERN      engineered basins, wastewater ponds, reservoirs
Classes 1-4 and 6 go to the patch-based removal (scripts/inpaint_methods.py exemplar); 5 and 7 need the 1863 land-cover layer.
All masks are grown by 1 px (1 m) to cover the measured 1.0 m median registration offset and ~1.5 m spread (results/registration.json).
Statistics go to results/masks.json; compact committed forms go to data/.
"""
import os, sys, json, pickle, time, gzip
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio, cv2
from rasterio.windows import Window
from rasterio.features import rasterize, shapes
from rasterio.transform import from_origin
from shapely.geometry import box as sbox, shape as sshape, mapping, Point
from shapely.ops import unary_union
from shapely.strtree import STRtree
from vec_load import to_ll
import aoi_util as A

ROOT = A.ROOT
MOD = os.path.join(ROOT, 'tmp', 'b1863', 'modern'); WORK = os.path.join(MOD, 'work')
OUT = os.path.join(ROOT, 'docs', 'basemap1863', 'modern')
RES = 1.0
recs = pickle.load(open(os.path.join(WORK, 'inventory_utm.pkl'), 'rb'))
ds = rasterio.open(os.path.join(WORK, 'naip2013_1.0m.tif'))
dc = rasterio.open(os.path.join(WORK, 'detect_class.tif')); dpp = rasterio.open(os.path.join(WORK, 'detect_ppav.tif')); dpr = rasterio.open(os.path.join(WORK, 'detect_proof.tif'))
H, W = ds.height, ds.width; x0, y1 = ds.bounds.left, ds.bounds.top
BLK, PAD = 1024, 48

CORR = {'ROAD_ARTERIAL': 14.0, 'ROAD_LOCAL': 7.0, 'ROAD_SERVICE': 4.5, 'PATH': 2.5, 'TRACK': 3.0, 'RAIL': 5.0}
CORE = {'ROAD_ARTERIAL': 3.0, 'ROAD_LOCAL': 2.0, 'ROAD_SERVICE': 1.2, 'PATH': 0.6, 'TRACK': 1.0, 'RAIL': 1.2}
UTIL_PT = ('POWER_SUPPORT', 'TOWER_COMM', 'TOWER_OBS', 'WATER_TOWER', 'FLAGPOLE', 'INFO_SIGN', 'SITE_FURNITURE')
AREA_RT = ('GOLF', 'SPORTS_REC', 'AIRFIELD', 'DEVELOPED_LAND')
geoms = [r['geom'] for r in recs]
tree = STRtree(geoms)


def ras(shapes_, shape, tr):
    shapes_ = [(g, 1) for g in shapes_ if g is not None and not g.is_empty]
    if not shapes_:
        return np.zeros(shape, np.uint8)
    return rasterize(shapes_, out_shape=shape, transform=tr, fill=0, dtype='uint8')


def grow(m, px):
    if px <= 0:
        return m
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1))
    return cv2.dilate(m.astype(np.uint8), k)


oprof = dict(driver='GTiff', height=H, width=W, count=1, dtype='uint8', crs=ds.crs, transform=ds.transform, compress='deflate', tiled=True, blockxsize=512, blockysize=512)
om = rasterio.open(os.path.join(WORK, 'removal_mask_1m.tif'), 'w', **oprof)
counts = {i: 0 for i in range(8)}
per_feature = {}   # id -> dict
unm_polys = []
t0 = time.time()
n_b = 0
for r0 in range(0, H, BLK):
    for c0 in range(0, W, BLK):
        h = min(BLK, H - r0); w = min(BLK, W - c0)
        pr0, pc0 = max(r0 - PAD, 0), max(c0 - PAD, 0); pr1, pc1 = min(r0 + h + PAD, H), min(c0 + w + PAD, W)
        shp = (pr1 - pr0, pc1 - pc0)
        win = Window(pc0, pr0, pc1 - pc0, pr1 - pr0)
        a = ds.read(window=win)
        if a[:3].max() == 0:
            continue
        tr = rasterio.windows.transform(win, ds.transform)
        bb = sbox(x0 + pc0 * RES, y1 - pr1 * RES, x0 + pc1 * RES, y1 - pr0 * RES)
        idx = tree.query(bb.buffer(40))
        sub = [recs[i] for i in idx]
        pav = dpp.read(1, window=win).astype(np.float32) / 255; rof = dpr.read(1, window=win).astype(np.float32) / 255
        r_, g_, b_, n_ = [a[i].astype(np.float32) for i in range(4)]
        ndvi = (n_ - r_) / (n_ + r_ + 1e-3)
        lum = 0.299 * r_ + 0.587 * g_ + 0.114 * b_
        mxc = np.maximum(np.maximum(r_, g_), b_); mnc = np.minimum(np.minimum(r_, g_), b_)
        sat = (mxc - mnc) / (mxc + 1e-3)
        imp = (ndvi < 0.12) & (sat < 0.30)          # impervious-looking: not vegetated, not strongly coloured
        # ---- roads / parking
        corr_g, core_g, park_g = [], [], []
        for r in sub:
            c = r['cls']
            g = r['geom']
            if c in CORR and g.geom_type in ('LineString', 'MultiLineString'):
                corr_g.append(g.buffer(CORR[c])); core_g.append(g.buffer(CORE[c]))
            elif c in ('PARKING', 'AIRFIELD') and g.geom_type in ('Polygon', 'MultiPolygon'):
                corr_g.append(g.buffer(2.0)); park_g.append(g)
        corr_m = ras(corr_g, shp, tr).astype(bool); core_m = ras(core_g, shp, tr).astype(bool); park_m = ras(park_g, shp, tr).astype(bool)
        road = ((pav > 0.5) & imp & corr_m) | (core_m & imp & (lum > 50)) | (park_m & imp)
        road = cv2.morphologyEx(road.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        road = cv2.morphologyEx(road, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)).astype(bool)
        # keep only road pieces that touch the mapped centre-line core (+3 m) or a mapped lot; drop floating specks
        touch = grow(core_m | park_m, 3).astype(bool)
        n_r, lab_r = cv2.connectedComponents(road.astype(np.uint8), connectivity=8)
        if n_r > 1:
            keep_ids = np.unique(lab_r[touch & road]); keep_ids = keep_ids[keep_ids > 0]
            road = np.isin(lab_r, keep_ids)
        # ---- buildings
        bld_g = [r['geom'] for r in sub if r['cls'] == 'BUILDING' and r['geom'].geom_type in ('Polygon', 'MultiPolygon')]
        bld_m = ras(bld_g, shp, tr).astype(bool)
        bld_near = grow(bld_m, 20).astype(bool)
        roof = (rof > 0.5) & bld_near & (ndvi < 0.25)
        # footprints count only where the 2013 image shows a roof (mean roof probability inside >= 0.25); new-since-2013 outlines are not cut out
        vis = np.zeros(shp, bool)
        bl = [r for r in sub if r['cls'] == 'BUILDING' and r['geom'].geom_type in ('Polygon', 'MultiPolygon') and r['geom'].intersects(bb)]
        if bl:
            labm = rasterize([(r['geom'], k + 1) for k, r in enumerate(bl)], out_shape=shp, transform=tr, fill=0, dtype='int32')
            cnt = np.bincount(labm.ravel(), minlength=len(bl) + 1); sm = np.bincount(labm.ravel(), weights=rof.ravel(), minlength=len(bl) + 1)
            good = np.zeros(len(bl) + 1, bool)
            for k, r in enumerate(bl):
                if cnt[k + 1] > 0:
                    pv = sm[k + 1] / cnt[k + 1]
                    if r['id'] not in per_feature or cnt[k + 1] > per_feature[r['id']].get('n', 0):
                        per_feature[r['id']] = dict(roof_prob=round(float(pv), 3), n=int(cnt[k + 1]))
                    good[k + 1] = pv >= 0.25
            vis = good[labm]
        building = roof | grow(vis, 1).astype(bool) | vis
        # ---- monuments, utilities
        pts_m, util_m, line_m = [], [], []
        for r in sub:
            c = r['cls']; g = r['geom']
            if c == 'MONUMENT':
                pts_m.append(g.centroid.buffer(2.5))
            elif c in UTIL_PT:
                util_m.append(g.centroid.buffer(1.5) if g.geom_type != 'Polygon' else g.buffer(1.0))
            elif c == 'POWER_LINE' and g.geom_type in ('LineString', 'MultiLineString'):
                line_m.append(g.buffer(1.0))
            elif c in ('STRUCTURE_OTHER',) and g.geom_type in ('Polygon', 'MultiPolygon'):
                util_m.append(g.buffer(1.0))
        mon = ras(pts_m, shp, tr).astype(bool)
        util = ras(util_m + line_m, shp, tr).astype(bool)
        # ---- areas
        area_g = [r['geom'] for r in sub if r['cls'] in AREA_RT + ('POWER_SITE',) and r['geom'].geom_type in ('Polygon', 'MultiPolygon')]
        area = ras(area_g, shp, tr).astype(bool)
        wat = ras([r['geom'] for r in sub if r['cls'] == 'WATER_MODERN' and r['geom'].geom_type in ('Polygon', 'MultiPolygon')], shp, tr).astype(bool)
        # ---- detected, no mapped feature within 12 m
        mapped = grow(road | building | mon | util | bld_m | corr_m, 12).astype(bool)
        det = (dc.read(1, window=win) > 0) & imp & ~mapped
        det = cv2.morphologyEx(det.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, lab, st, cen = cv2.connectedComponentsWithStats(det, connectivity=8)
        unm = np.zeros(shp, bool)
        for k in range(1, n):
            ar = st[k, cv2.CC_STAT_AREA]
            if ar >= 80 and ar / (st[k, cv2.CC_STAT_WIDTH] * st[k, cv2.CC_STAT_HEIGHT]) >= 0.25:
                unm |= lab == k
        # ---- compose, grown 1 px
        out = np.zeros(shp, np.uint8)
        out[area] = 5; out[wat] = 7
        out[grow(unm, 1).astype(bool)] = 6
        out[grow(road, 1).astype(bool)] = 1
        out[grow(building, 1).astype(bool)] = 2
        out[mon] = 3; out[grow(util, 1).astype(bool)] = 4
        ir, ic = r0 - pr0, c0 - pc0
        core = out[ir:ir + h, ic:ic + w]
        om.write(core, 1, window=Window(c0, r0, w, h))
        for k in range(1, 8):
            counts[k] += int((core == k).sum())
        # polygons of unmapped detections (centre of the block only, so none is cut twice)
        um = (core == 6).astype(np.uint8)
        if um.any():
            ttr = rasterio.windows.transform(Window(c0, r0, w, h), ds.transform)
            for geom, v in shapes(um, mask=um.astype(bool), transform=ttr):
                if v == 1:
                    gg = sshape(geom)
                    if gg.area >= 60:
                        unm_polys.append(gg)
        n_b += 1
        if n_b % 20 == 0:
            print('block', n_b, round(time.time() - t0), 's', flush=True)
om.close()
names = {1: 'ROAD_SURFACE', 2: 'BUILDING', 3: 'MONUMENT', 4: 'UTILITY', 5: 'AREA_RETEXTURE', 6: 'DETECTED_UNMAPPED', 7: 'WATER_MODERN'}
tot_px = H * W
stats = {names[k]: dict(pixels=v, area_ha=round(v * RES * RES / 1e4, 1), percent_of_box=round(100 * v / tot_px, 3)) for k, v in counts.items() if k}
rp = [v['roof_prob'] for v in per_feature.values()]
rp = np.array(rp)
res = dict(grid='EPSG:26918, 1.0 m, origin (%.1f, %.1f), %d x %d px' % (x0, y1, W, H), box_area_km2=round(tot_px * RES * RES / 1e6, 1), classes=stats,
           patch_removal_area_ha=round(sum(counts[k] for k in (1, 2, 3, 4, 6)) * RES * RES / 1e4, 1),
           retexture_area_ha=round(sum(counts[k] for k in (5, 7)) * RES * RES / 1e4, 1),
           building_outlines_evaluated=int(len(rp)), building_outlines_with_roof_visible_in_2013=int((rp >= 0.25).sum()), building_outlines_not_visible_in_2013=int((rp < 0.25).sum()),
           detected_unmapped_components=len(unm_polys), detected_unmapped_area_ha=round(sum(p.area for p in unm_polys) / 1e4, 2),
           elapsed_s=round(time.time() - t0))
json.dump(res, open(os.path.join(OUT, 'results', 'masks.json'), 'w'), indent=1)
pickle.dump(unm_polys, open(os.path.join(WORK, 'unmapped_polys.pkl'), 'wb'))
pickle.dump(per_feature, open(os.path.join(WORK, 'building_roofprob.pkl'), 'wb'))
print(json.dumps(res, indent=1))
