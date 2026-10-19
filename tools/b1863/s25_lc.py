"""Stage 25: rasterise the 1863 land-cover reconstruction and the two change maps onto the build grid (1 m).

tmp/b1863/build/lc1863.tif  uint8
  0 outside the Warren-sheet coverage (1863 land cover UNKNOWN: nothing is changed there except removal of modern structures)
  1 open ground (field/meadow/pasture/crop, crop UNKNOWN)      2 woods      3 orchard      4 wheat (the documented Wheatfield)
  5 marsh/wet      6 boulder field      7 town block (built-up, handled by the structures stage)      8 cleared slope (Little Round Top west)
tmp/b1863/build/chg_remove.tif  uint8 1 = modern canopy absent in 1863 (lidar canopy outside every 1863 tree polygon + tolerance)
tmp/b1863/build/chg_add.tif     uint8 1 = 1863 woods tree cover, 2 = 1863 orchard, 0 none  (open now, trees then)
Precedence of overlapping classes: wheat > cleared slope > boulder > marsh > orchard > woods > town > open.
"""
import sys, os, time, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import rasterio

LC = os.path.join(C.FEAT, 'landcover')

def polys(name, **flt):
    d = C.load_geojson(os.path.join(LC, name + '.geojson'))
    out = []
    for f in d['features']:
        if f['geometry']:
            out.append((C.geom_to_utm(f['geometry']), f['properties']))
    return out

def burn(items, val, arr, simplify=0.5):
    from shapely.geometry import mapping
    from rasterio import features
    from rasterio.transform import Affine
    tr = Affine(1.0, 0, C.X0, 0, -1.0, C.Y0)
    sh = [(g.simplify(simplify) if simplify else g, val) for g, _ in items if not g.is_empty]
    if sh:
        features.rasterize(sh, out=arr, transform=tr, default_value=val)

def main():
    C.lowprio()
    t0 = time.time()
    lc = np.zeros((C.H, C.W), np.uint8)
    cover = polys('coverage_warren_sheet')
    burn(cover, 1, lc)                       # inside the sheet: open by default
    for name, v in (('excluded_town_zone', 7), ('woods_1863', 2), ('orchards_1863', 3), ('marsh_wetland_1863', 5), ('boulder_fields_1863', 6), ('open_cleared_1863', 8), ('fields_documented_1863', 4)):
        burn(polys(name), v, lc)
    # the town zone is a hole in the sheet's land cover but woods inside it stay: re-burn woods/orchards only outside the town zone is not needed (town drawn after)
    print('lc done', time.time() - t0, {int(k): int(v) for k, v in zip(*np.unique(lc, return_counts=True))})
    # ---- change decisions on the lidar canopy grid (2 m cells, origin 303000 / 4416200, aligned with the build grid)
    # Registration of the Warren-derived outlines to the ground is 30-40 m (SOURCES-landcover.md section 5), so a change is only made where it
    # holds with a 60 m margin (registration error: median 27 m, p90 40 m, max 63 m measured by the land-cover task): canopy is removed only where it lies more than TOL (60) m from every 1863 tree polygon, trees are added only where the
    # modern canopy is more than TOL m away. Everything inside the margin stays as photographed (recorded as AMBIGUOUS in the provenance layer).
    TOL = 60.0       # adds
    TOL_REM = 150.0  # removals: the Little Round Top east-slope woods (wooded in 1863 per NPS) lie 60-110 m outside the Warren-derived polygon; the measured registration maximum is 63 m, so a removal needs 150 m of clearance from every 1863 tree polygon
    canopy2 = np.load(os.path.join(C.ROOT, 'tmp', 'b1863', 'landcover', 'canopy_smooth.npy')).astype(np.uint8)   # 2 m cells, 2017 lidar, from landcover/scripts/final_build.py
    r_off, c_off = int(C.Y0 - 4416200.0), int(303000.0 - C.X0)        # build-grid offset of the CHM grid (rows 460, cols 3780)
    h2, w2 = canopy2.shape
    def to2(a):        # 1 m -> 2 m window aligned with the CHM grid: any-pixel
        sub = a[r_off:r_off + h2 * 2, c_off:c_off + w2 * 2]
        sub = np.pad(sub, ((0, h2 * 2 - sub.shape[0]), (0, w2 * 2 - sub.shape[1])))
        return sub.reshape(h2, 2, w2, 2).max(axis=(1, 3))
    sc = np.zeros((C.H, C.W), np.uint8)
    burn(polys('scattered_trees_1863'), 1, sc)
    trees63 = (lc == 2) | (lc == 3) | (sc == 1)
    cov2 = to2((lc > 0).astype(np.uint8)); t2 = to2(trees63.astype(np.uint8)); town2 = to2((lc == 7).astype(np.uint8))
    lc2 = to2(((lc == 2) | (lc == 3)).astype(np.uint8)); orch2 = to2((lc == 3).astype(np.uint8)); clr2 = to2((lc == 8).astype(np.uint8))
    kT = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * int(TOL / 2) + 1,) * 2)
    kR = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * int(TOL_REM / 2) + 1,) * 2)
    near_tree = cv2.dilate(t2, kR)
    rem2 = canopy2 & cov2 & (1 - near_tree) & (1 - town2)
    rem2 = cv2.morphologyEx(rem2, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    near_can = cv2.dilate(canopy2, kT)
    wd2 = to2((lc == 2).astype(np.uint8))
    add2 = wd2 & (1 - near_can) & (1 - clr2) & (1 - town2)
    add2 = cv2.morphologyEx(add2, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    # orchards: the polygon eroded by 12 m (outline error) and with no modern canopy within 25 m (so a surviving or replanted modern orchard is never doubled)
    o_er = cv2.erode(orch2, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    near_can25 = cv2.dilate(canopy2, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    # modern orchards (OpenStreetMap landuse=orchard: the NPS rehabilitated orchards, e.g. Sherfy's Peach Orchard) are already in the photograph: never doubled (25 m margin)
    import json as _j
    from shapely.geometry import Polygon as _P
    mo = []
    for e in _j.load(open(os.path.join(C.ROOT, 'tmp', 'b1863', 'modern', 'vec', 'osm_landuse.json')))['elements']:
        if e.get('tags', {}).get('landuse') == 'orchard' and 'geometry' in e:
            mo.append(_P([C.ll2utm(p['lon'], p['lat']) for p in e['geometry']]).buffer(25))
    modern_orch = C.rasterize(mo).astype(np.uint8)
    mo2 = to2(modern_orch)
    addo2 = o_er & (1 - near_can25) & (1 - town2) & (1 - mo2)
    addo2 = cv2.morphologyEx(addo2, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    # ambiguous: canopy within the margin of an 1863 tree polygon that is not in an 1863 tree polygon itself, and 1863 tree polygon pixels with canopy within margin and none inside
    amb2 = (canopy2 & cov2 & near_tree & (1 - t2)) | (lc2 & near_can & (1 - canopy2))
    def to1(a2):
        up = np.zeros((C.H, C.W), np.uint8)
        big = np.repeat(np.repeat(a2, 2, 0), 2, 1)
        hh = min(big.shape[0], C.H - r_off); ww = min(big.shape[1], C.W - c_off)
        up[r_off:r_off + hh, c_off:c_off + ww] = big[:hh, :ww]
        return up
    rem = to1(rem2); add = to1(add2); amb = to1(amb2); addo = to1(addo2)
    add[(addo == 1) & (add == 0)] = 2
    print('remove', int(rem.sum()), 'add woods', int((add == 1).sum()), 'add orchard', int((add == 2).sum()), 'ambiguous', int(amb.sum()), 'canopy within coverage frac', float(canopy2[cov2 > 0].mean()))
    prof = dict(driver='GTiff', height=C.H, width=C.W, count=1, dtype='uint8', crs=C.CRS, transform=rasterio.Affine(1.0, 0, C.X0, 0, -1.0, C.Y0),
                compress='deflate', tiled=True, blockxsize=512, blockysize=512)
    for n, a in (('lc1863', lc), ('chg_remove', rem), ('chg_add', add), ('chg_ambiguous', amb)):
        with rasterio.open(os.path.join(C.BUILD, n + '.tif'), 'w', **prof) as dst:
            dst.write(a, 1)
    st = dict(lc={int(k): int(v) for k, v in zip(*np.unique(lc, return_counts=True))}, remove_px=int(rem.sum()), add_woods_px=int((add == 1).sum()), add_orchard_px=int((add == 2).sum()), ambiguous_px=int(amb.sum()), tol_m=TOL, elapsed=time.time() - t0)
    json.dump(st, open(os.path.join(C.BUILD, 'lc_stats.json'), 'w'), indent=1)
    print(st)

if __name__ == '__main__':
    main()
