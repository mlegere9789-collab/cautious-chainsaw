"""Stage 10: turn the modern removal mask into the working target map.

Output tmp/b1863/build/target.tif (uint8, same grid as the base):
  0 nothing to do
  1 THIN   removal target filled by PatchMatch from its own surroundings (roads, drives, roofs, small objects)
  2 DEEP   removal target too wide for patch filling (a pixel is >= DEEP_R px from any clean pixel somewhere in its component):
           synthesised from a texture bank in stage 30
  5 AREA   golf, sports, airfield, solar, developed land: synthesised according to the 1863 land-cover class (stage 30)
  7 WATER  modern engineered basins: same
Survivors: the 41 buildings the structures catalogue retains as 1863 fabric are NOT removed (their real roof pixels stay): class-2 pixels
connected to the footprint and within 14 m of it are un-masked, so the roof and its own cast shadow stay in the photograph.
All removal classes are grown by GROW px to cover 1 m registration offset and fence/shoulder ghosts.
"""
import sys, os, time, csv, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import rasterio
from rasterio.windows import Window

GROW = 2
DEEP_R = 11

def main():
    C.lowprio()
    t0 = time.time()
    with rasterio.open(C.MASK_TIF) as d:
        m = d.read(1)
        prof = d.profile
    print('mask loaded', m.shape, time.time() - t0)
    lc_all = rasterio.open(os.path.join(C.BUILD, 'lc1863.tif')).read(1)
    boulder = (lc_all == 6)          # 1863 boulder fields (Devil's Den, Houck's Ridge): the pale rocks are natural; never taken for pavement or monuments (pass 5, R5-01/R5-02)
    unl = rasterio.open(os.path.join(C.BUILD, 'unlisted.tif')).read(1)       # stage 09: modern surfaces found in the photograph itself
    m[(unl == 1) & (m == 0) & ~boulder] = C.M_AREA
    print('unlisted modern area px added', int(((unl == 1) & ~boulder).sum()), 'woods clearings', int((unl == 2).sum()))
    # survivors
    ids = {r['structure_id']: r for r in csv.DictReader(open(os.path.join(C.FEAT, 'structures', 'retain_1863_survivors.csv'), encoding='utf-8'))}
    st = C.load_geojson(os.path.join(C.FEAT, 'structures', 'structures.geojson'))
    kept = []
    survm = np.zeros(m.shape, np.uint8)
    for f in st['features']:
        if f['properties']['id'] in ids and f['geometry'] and f['geometry']['type'] == 'Polygon':
            g = C.geom_to_utm(f['geometry'])
            gp = g.buffer(2.0)
            b = gp.bounds
            c0 = int(b[0] - C.X0) - 16; r0 = int(C.Y0 - b[3]) - 16
            w = int(b[2] - b[0]) + 33; h = int(b[3] - b[1]) + 33
            sub = m[r0:r0 + h, c0:c0 + w]
            bm = (sub == C.M_BLDG).astype(np.uint8)
            foot = C.rasterize([gp], r0, r0 + h, c0, c0 + w).astype(bool)
            n, lab = cv2.connectedComponents(bm, connectivity=8)
            hit = np.unique(lab[foot & (bm > 0)]); hit = hit[hit > 0]
            keep = np.isin(lab, hit)
            near = cv2.dilate(foot.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))).astype(bool)      # 6 m: the roof, its eaves and the shadow edge; the modern annexes, yards and parking beside it are removed (pass 6: H05 to H07, H33 to H36)
            keep &= near
            footb = C.rasterize([g.buffer(1.0)], r0, r0 + h, c0, c0 + w).astype(bool)      # the roof outline itself (and 1 m of eaves) is protected whatever the mask says or any later rule adds
            keep |= footb
            sub[keep] = 0
            survm[r0:r0 + h, c0:c0 + w][keep] = 1
            kept.append((f['properties']['id'], int(keep.sum())))
    print('survivors un-masked:', len(kept), sum(k[1] for k in kept), 'px')
    # monument plazas, plinths and steps: the mask is only a 2.5 m disc at each point; pavement (detector probability > 0.38) or bright pale stone within 22 m of a disc and
    # connected to it is added to the removal (class 3). Measured: see BUILD.md (monument plaza residue check).
    dp = rasterio.open(os.path.join(C.TMPW, 'detect_ppav.tif')); db = rasterio.open(C.BASE_TIF)
    added = 0
    for r0 in range(0, C.H, 2048):
        r1 = min(r0 + 2048, C.H); R0 = max(r0 - 40, 0); R1 = min(r1 + 40, C.H)
        sub = m[R0:R1]
        mon = (sub == C.M_MON).astype(np.uint8)
        if not mon.any():
            continue
        zone = cv2.dilate(mon, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45))) > 0
        ppav = dp.read(1, window=Window(0, R0, C.W, R1 - R0)); rgb = db.read([1, 2, 3], window=Window(0, R0, C.W, R1 - R0)).astype(np.float32)
        lum = rgb.mean(0); sat = (rgb.max(0) - rgb.min(0)) / np.maximum(rgb.max(0), 1)
        cand = zone & (sub == 0) & ((ppav > 96) | ((lum > 165) & (sat < 0.15))) & ~boulder[R0:R1]
        n_, lab = cv2.connectedComponents(((cand) | (mon > 0)).astype(np.uint8), connectivity=8)
        keepl = np.unique(lab[mon > 0]); keepl = keepl[keepl > 0]
        add = np.isin(lab, keepl) & cand
        sub[add] = C.M_MON
        added += int(add[(r0 - R0):(r1 - R0)].sum())
    print('monument plaza px added', added)
    # pavement growth: the mask holds the detector's pavement inside a narrow corridor; wide roads (divided highways, ramps, paved shoulders, concrete lanes) keep pale pavement outside it.
    # Pixels that look like pavement (NDVI < 0.18, saturation < 0.22, luminance 95-225) and connect to the road mask within 12 px are added; arterials within 45 m of a mapped arterial centre line, other roads within 15 m.
    import pickle
    recs = pickle.load(open(os.path.join(C.TMPW, 'inventory_utm.pkl'), 'rb'))
    art = [r['geom'].buffer(45) for r in recs if r['cls'] == 'ROAD_ARTERIAL' and r['geom'].geom_type in ('LineString', 'MultiLineString')]
    oth = [r['geom'].buffer(15) for r in recs if r['cls'] in ('ROAD_LOCAL', 'ROAD_SERVICE', 'PARKING') and r['geom'].geom_type in ('LineString', 'MultiLineString', 'Polygon', 'MultiPolygon')]
    from shapely.ops import unary_union
    zart = C.rasterize([unary_union(art)] if art else []).astype(bool)
    zoth = C.rasterize([unary_union(oth)] if oth else []).astype(bool)
    grown_px = 0
    for r0 in range(0, C.H, 2048):
        r1 = min(r0 + 2048, C.H); R0 = max(r0 - 20, 0); R1 = min(r1 + 20, C.H)
        sub = m[R0:R1]
        seed = (sub == C.M_ROAD)
        if not seed.any():
            continue
        rgb = db.read([1, 2, 3, 4], window=Window(0, R0, C.W, R1 - R0)).astype(np.float32)
        lum = rgb[:3].mean(0); sat = (rgb[:3].max(0) - rgb[:3].min(0)) / np.maximum(rgb[:3].max(0), 1); ndvi = (rgb[3] - rgb[0]) / np.maximum(rgb[3] + rgb[0], 1)
        cand = (ndvi < 0.18) & (sat < 0.22) & (lum > 95) & (lum < 225) & (sub == 0) & (zart[R0:R1] | zoth[R0:R1])
        cand &= ~(zoth[R0:R1] & ~zart[R0:R1] & (cv2.dilate(seed.astype(np.uint8), np.ones((31, 31), np.uint8)) == 0))
        cand &= ~boulder[R0:R1]
        g = seed.copy()
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        for _ in range(6):
            g = (cv2.dilate(g.astype(np.uint8), k) > 0) & (cand | g)
        add = g & ~seed & cand
        # keep only the part within 12 px of the seed (6 iterations of 2 px)
        sub[add] = C.M_ROAD
        grown_px += int(add[(r0 - R0):(r1 - R0)].sum())
    print('pavement growth px added', grown_px)
    # unlisted monuments, tablets and statues: the monument list locates 938 of about 1,320; most of the others stand beside the park roads and paths. Small bright compact objects
    # (6-150 px, luminance 28 above the local mean, low saturation, not vegetation) within 45 m of a mapped road, path or parking lot are removed (not in the boulder field, not in the town block).
    zline = [r['geom'].buffer(45) for r in recs if r['cls'] in ('PATH', 'ROAD_LOCAL', 'ROAD_SERVICE', 'ROAD_ARTERIAL', 'PARKING', 'TRACK') and r['geom'].geom_type in ('LineString', 'MultiLineString', 'Polygon', 'MultiPolygon')]
    zmon = C.rasterize([unary_union(zline)]).astype(bool)
    lcr = rasterio.open(os.path.join(C.BUILD, 'lc1863.tif'))
    small_px = 0; small_n = 0
    for r0 in range(0, C.H, 2048):
        r1 = min(r0 + 2048, C.H); R0 = max(r0 - 24, 0); R1 = min(r1 + 24, C.H)
        sub = m[R0:R1]
        z = zmon[R0:R1] & (sub == 0)
        if not z.any():
            continue
        rgb = db.read([1, 2, 3, 4], window=Window(0, R0, C.W, R1 - R0)).astype(np.float32)
        lcw = lcr.read(1, window=Window(0, R0, C.W, R1 - R0))
        lum = rgb[:3].mean(0); sat = (rgb[:3].max(0) - rgb[:3].min(0)) / np.maximum(rgb[:3].max(0), 1); ndvi = (rgb[3] - rgb[0]) / np.maximum(rgb[3] + rgb[0], 1)
        loc = cv2.GaussianBlur(lum, (0, 0), 12)
        cand = z & ((lum - loc) > 28) & (sat < 0.22) & (ndvi < 0.2) & (lcw != 6) & (lcw != 7)
        cand = cv2.morphologyEx(cand.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        n_, lab, st_, _ = cv2.connectedComponentsWithStats(cand, connectivity=8)
        keep = np.zeros(cand.shape, bool)
        for i in range(1, n_):
            if 6 <= st_[i, cv2.CC_STAT_AREA] <= 150 and max(st_[i, cv2.CC_STAT_WIDTH], st_[i, cv2.CC_STAT_HEIGHT]) <= 22:
                keep |= lab == i
        keep = cv2.dilate(keep.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        keep &= (sub == 0)
        sub[keep] = C.M_MON
        small_px += int(keep[(r0 - R0):(r1 - R0)].sum())
    print('small bright objects px added', small_px)
    # rim growth: a removed surface leaves its edge (curb, apron, gravel shoulder, fence-line ghost) when the mask stops a pixel or two short of it. Pixels that look like paving or bare
    # unvegetated neutral ground (NDVI < 0.06, max-min <= 18, |R-G| <= 10, luma 85-235) and connect to a removal target within 8 px are added (not in boulder fields, not water, not survivor roofs).
    seed_all = np.isin(m, [C.M_ROAD, C.M_BLDG, C.M_MON, C.M_UTIL, C.M_UNMAP, C.M_AREA, C.M_WATER])
    rim_px = 0
    for r0 in range(0, C.H, 2048):
        r1 = min(r0 + 2048, C.H); R0 = max(r0 - 16, 0); R1 = min(r1 + 16, C.H)
        seed = seed_all[R0:R1]
        if not seed.any():
            continue
        a = db.read([1, 2, 3, 4], window=Window(0, R0, C.W, R1 - R0)).astype(np.float32)
        Rr, Gg, Bb, Nn = a
        mx = a[:3].max(0); mn = a[:3].min(0); Ll = a[:3].mean(0); nd = (Nn - Rr) / np.maximum(Nn + Rr, 1)
        cand = (nd < 0.06) & (nd > -0.33) & ((mx - mn) <= 18) & (np.abs(Rr - Gg) <= 10) & (Ll >= 85) & (Ll <= 235) & ~seed & ~boulder[R0:R1] & (survm[R0:R1] == 0)
        g = seed.copy()
        k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        for _ in range(4):
            g = (cv2.dilate(g.astype(np.uint8), k5) > 0) & (cand | g)
        add = g & ~seed
        sub = m[R0:R1]
        sub[add & (sub == 0)] = C.M_UNMAP
        rim_px += int(add[(r0 - R0):(r1 - R0)].sum())
    print('rim growth px added', rim_px)
    thin_src = np.isin(m, [C.M_ROAD, C.M_BLDG, C.M_MON, C.M_UTIL, C.M_UNMAP])
    thin_src = cv2.dilate(thin_src.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * GROW + 1, 2 * GROW + 1)))
    print('dilated', time.time() - t0)
    # deep detection: erode by DEEP_R; components that hold a surviving core are deep
    core = cv2.erode(thin_src, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * DEEP_R + 1, 2 * DEEP_R + 1)), borderValue=0)
    print('core px', int(core.sum()))
    del_ = None
    # deep = the opening-reconstruction of the wide parts: pixels within DEEP_R+2 of a core pixel (roads leaving a wide blob stay thin)
    deep = (cv2.dilate(core, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * (DEEP_R + 2) + 1, 2 * (DEEP_R + 2) + 1))) > 0) & (thin_src > 0)
    out = np.zeros_like(m)
    out[thin_src > 0] = 1
    out[deep] = 2
    area = (m == C.M_AREA); water = (m == C.M_WATER)
    out[area] = 5
    out[water] = 7
    # thin pixels next to a wide target belong to it: a removed lot is one piece of ground, filled in one go from the real ground around the whole of it. (Filled apart, the narrow bays between the aisles
    # of a parking lot were patched from a context that held the blurred pale surface of the wide part, and stayed as beige ghosts of the old layout: pass 6, H13 to H16.)
    wide = (out == 2) | (out == 5) | (out == 7)
    near_wide = cv2.dilate(wide.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))) > 0
    out[(out == 1) & near_wide] = 2
    # Soldiers' National Cemetery (OSM way 131108963): founded by Pennsylvania in autumn 1863, after the battle; its graves, paths and layout did not exist on 1-3 July 1863.
    # Hoffman/Evergreen pasture then: retextured as open ground. (Evergreen Cemetery, 1854, existed and is kept; its later sections cannot be separated: UNKNOWN.)
    import json as _j
    els = _j.load(open(os.path.join(C.ROOT, 'tmp', 'b1863', 'modern', 'vec', 'osm_landuse.json')))['elements']
    from shapely.geometry import Polygon
    for e in els:
        if e.get('id') == 131108963:
            g = Polygon([C.ll2utm(p['lon'], p['lat']) for p in e['geometry']])
            nat = C.rasterize([g]).astype(bool) & (survm == 0)
            out[nat] = 5
            print('National Cemetery px', int(nat.sum()))
    out[(unl == 2) & (out == 0) & ~boulder] = 8        # modern clearing in woods (power-line swaths): refilled with woods in stage 30
    out[survm == 1] = 0                                  # the real roofs of the buildings that stood in 1863 are never touched by any removal rule
    # thin targets sitting inside AREA/WATER polygons belong to them
    for k, v in (('THIN', 1), ('DEEP', 2), ('AREA', 5), ('WATER', 7), ('WOODS_CLEARING', 8)):
        print(k, int((out == v).sum()), 'px')
    prof.update(dtype='uint8', count=1, compress='deflate', tiled=True, blockxsize=512, blockysize=512)
    prof.pop('interleave', None)
    with rasterio.open(os.path.join(C.BUILD, 'target.tif'), 'w', **prof) as dst:
        dst.write(out, 1)
    with rasterio.open(os.path.join(C.BUILD, 'survivors.tif'), 'w', **prof) as dst:
        dst.write(survm, 1)
    with open(os.path.join(C.BUILD, 'targets_stats.json'), 'w') as f:
        import json
        json.dump(dict(small_object_px_added=small_px, pavement_growth_px_added=grown_px, monument_plaza_px_added=added, survivors_unmasked=kept, thin_px=int((out == 1).sum()), deep_px=int((out == 2).sum()), area_px=int((out == 5).sum()), water_px=int((out == 7).sum()),
                       grow_px=GROW, deep_radius_px=DEEP_R, elapsed_s=round(time.time() - t0, 1)), f, indent=1)
    print('done', time.time() - t0)

if __name__ == '__main__':
    main()
