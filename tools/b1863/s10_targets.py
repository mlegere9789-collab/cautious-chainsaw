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
            near = cv2.dilate(foot.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (29, 29))).astype(bool)
            keep &= near
            sub[keep] = 0
            survm[r0:r0 + h, c0:c0 + w][keep] = 1
            kept.append((f['properties']['id'], int(keep.sum())))
    print('survivors un-masked:', len(kept), sum(k[1] for k in kept), 'px')
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
    # thin targets sitting inside AREA/WATER polygons belong to them
    for k, v in (('THIN', 1), ('DEEP', 2), ('AREA', 5), ('WATER', 7)):
        print(k, int((out == v).sum()), 'px')
    prof.update(dtype='uint8', count=1, compress='deflate', tiled=True, blockxsize=512, blockysize=512)
    prof.pop('interleave', None)
    with rasterio.open(os.path.join(C.BUILD, 'target.tif'), 'w', **prof) as dst:
        dst.write(out, 1)
    with rasterio.open(os.path.join(C.BUILD, 'survivors.tif'), 'w', **prof) as dst:
        dst.write(survm, 1)
    with open(os.path.join(C.BUILD, 'targets_stats.json'), 'w') as f:
        import json
        json.dump(dict(survivors_unmasked=kept, thin_px=int((out == 1).sum()), deep_px=int((out == 2).sum()), area_px=int((out == 5).sum()), water_px=int((out == 7).sum()),
                       grow_px=GROW, deep_radius_px=DEEP_R, elapsed_s=round(time.time() - t0, 1)), f, indent=1)
    print('done', time.time() - t0)

if __name__ == '__main__':
    main()
