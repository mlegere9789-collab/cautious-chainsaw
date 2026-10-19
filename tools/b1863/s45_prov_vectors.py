"""Stage 45: vector provenance layer (GeoJSON, WGS84) in docs/basemap1863/PROVENANCE-LAYER/.

added_features.geojson   every drawn road, rail, bridge, fence, building, mass, orchard area, crop area: id, class, name, confidence, positional_error_m, method, sources[{title, locator, url, type}]
changed_regions.geojson.gz  polygons (2 m raster, simplified 3 m, >= 100 m2) of the pixel classes 1-5 (removed or re-synthesised ground, canopy removed, trees added, town ground) and 20 (ambiguous, kept) with class code, name, area_ha
classes.json             class codes, names, meaning, honesty label
"""
import sys, os, json, gzip, pickle, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from s39_final import NAMES
from shapely.geometry import mapping, Polygon, shape, MultiPolygon
from shapely.ops import transform as stransform, unary_union

SRC = {
    'warren': dict(title='G. K. Warren, Map of the battle field of Gettysburg (survey 1868-69, revised 1873), Library of Congress Geography and Map Division', locator='cw0353500', url='https://www.loc.gov/item/99448794/', type='A1'),
    'hopkins': dict(title='G. M. Hopkins / M. S. & E. Converse, Map of Adams Co., Pennsylvania (1858), Gettysburg borough inset', locator='la000697 (scan), LoC item 2004629149', url='https://www.loc.gov/item/2004629149/', type='A1'),
    'bachelder': dict(title="Bachelder, Map of the battle field of Gettysburg (1876; topography from Warren), sheet cw0325000a", locator='cw0325000a', url='https://www.loc.gov/item/99447491/', type='A1'),
}
CONF_NAME = {1: 'Documented', 2: 'Estimated', 3: 'Contested'}
DEFS = {
    0: 'photograph kept, inside the Warren-sheet coverage: not verified as 1863, no source says it differs',
    22: 'photograph kept, outside the Warren-sheet coverage: 1863 land cover unknown',
    1: 'modern feature (road, roof, utility, small object) removed; filled by PatchMatch from the surroundings',
    2: 'modern feature or area removed; ground re-synthesised from real photograph blocks',
    3: 'modern tree canopy outside 1863 tree cover (beyond the 100 m registration margin) replaced by open-ground texture',
    4: '1863 woods tree cover that is open now (beyond the 60 m margin): canopy blocks added',
    5: 'town block: modern street and yard trees removed',
    6: '1863 road drawn', 7: '1863 railway or railroad grade drawn', 8: '1863 bridge drawn', 9: '1863 fence drawn', 10: '1863 structure drawn (schematic roof)',
    11: '1863 orchard trees drawn', 12: 'Wheatfield recoloured to ripe wheat', 13: '1868-69 survey building mass drawn (schematic roofs)',
    20: 'inside the registration margin of an 1863 tree polygon: photograph kept, the evidence cannot decide', 21: 'building that stood in 1863 and still stands: real roof pixels kept'}

def to_ll(g):
    return stransform(lambda x, y, z=None: C.utm2ll(x, y), g)

def main():
    os.makedirs(C.PROV, exist_ok=True)
    items = pickle.load(open(os.path.join(C.BUILD, 'draw_items.pkl'), 'rb'))
    feats = []
    def add(i, cls, geom, name, conf, err, method, sources, extra=None):
        p = dict(id=i, cls=cls, name=name, confidence=conf, positional_error_m=err, method=method, sources=sources)
        if extra: p.update(extra)
        feats.append(dict(type='Feature', properties=p, geometry=mapping(to_ll(geom))))
    for r in items['roads']:
        hop = r['id'].startswith('HOP-S')
        src = [SRC['hopkins']] if hop else [SRC['bachelder'], SRC['warren']]
        add(r['id'], 'ROAD_ADDED', r['geom'], r.get('name'), r['conf'], r.get('err'),
            'street plan of 1858 (Hopkins inset): the modern non-service street centre line lies in a street gap of the inset (reviewed on review_street_overlay.png); drawn as an unpaved town street 6.5 m wide' if hop else
            'road catalogue geometry (modern centre line on the 1863 corridor, checked against the period sheets); drawn as an unpaved ribbon of %.1f m (class width)' % r['width'], src, dict(width_m=r['width']))
    for r in items['rails']:
        add(r['id'], 'RAIL_ADDED', r['geom'], r['kind'], r['conf'], r.get('err'), 'railway catalogue geometry; drawn as %s' % ('a ballasted single track' if r['kind'] == 'track' else 'an earth grade (no track laid by July 1863)'), [SRC['bachelder']])
    for r in items['bridges']:
        add(r['id'], 'BRIDGE_ADDED', r['pt'], r.get('name'), r['conf'], r.get('err'), 'bridge point of the catalogue snapped to the road centre line; deck 11 m', [SRC['bachelder']])
    for r in items['fences']:
        add(r['id'], 'FENCE_ADDED', r['geom'], 'fence' if not r['stone'] else 'stone wall', r['conf'], r.get('err'), 'modern line with a continuous drawn line on the period sheet; 1863 style UNKNOWN', [SRC['bachelder']])
    for r in items['structures']:
        if r.get('src') == 'hopkins':
            add(r['id'], 'STRUCTURE_ADDED', r['geom'], 'Gettysburg borough building symbol (1858 inset)', 'Estimated', 4, 'solid building symbol read from the Hopkins inset; footprint = symbol extent; roof drawn schematically (lots, ridge direction and roof material are NOT in the source)', [SRC['hopkins']])
        else:
            add(r['id'], 'STRUCTURE_ADDED', r['geom'], r.get('name'), r['conf'], r.get('err'),
                'catalogue entry %s (%s); footprint %s; roof drawn schematically' % (r['id'], r['sub'], 'documented size' if r.get('dims') else 'typical size for the building type'), [SRC['bachelder'], SRC['warren']])
    for r in items['masses']:
        add(r['id'], 'TOWN_MASS_ADDED', r['geom'], 'building mass of the 1868-69 survey', r['conf'], r.get('err'), 'extent of inked building mass on the Warren plate, not an individual footprint; roofs drawn schematically', [SRC['warren']])
    for r in items['orchards']:
        add(r['id'], 'ORCHARD_AREA', r['geom'], 'orchard (Warren symbol area)', r['conf'], 30, 'orchard polygon of the land-cover catalogue; trees drawn only where no modern canopy lies within 25 m, polygon eroded by 12 m', [SRC['warren']])
    fc = dict(type='FeatureCollection', name='added_features_1863',
              properties=dict(label='RECONSTRUCTION of Gettysburg, July 1863: no aerial photograph of 1863 exists. Every feature lists its sources, method, positional error and confidence.'), features=feats)
    json.dump(fc, open(os.path.join(C.PROV, 'added_features.geojson'), 'w'), separators=(',', ':'))
    print('added features', len(feats))
    # changed regions from the provenance raster, 2 m
    P = np.memmap(os.path.join(C.BUILD, 'prov.u8'), dtype=np.uint8, mode='r', shape=(C.H, C.W))
    regs = []
    for code in (1, 2, 3, 4, 5, 20):
        m = np.zeros((C.H // 2, C.W // 2), np.uint8)
        for r0 in range(0, C.H - 1, 2048):
            r1 = min(r0 + 2048, C.H // 2 * 2)
            blk = np.array(P[r0:r1, :C.W // 2 * 2])
            m[r0 // 2:r1 // 2] = (blk.reshape((r1 - r0) // 2, 2, C.W // 2, 2) == code).any(axis=(1, 3))
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hier is None:
            continue
        hier = hier[0]
        n = 0
        for i, cnt in enumerate(cs):
            if hier[i][3] != -1 or cv2.contourArea(cnt) < 25:        # >= 100 m2 at 2 m cells
                continue
            ap = cv2.approxPolyDP(cnt, 1.0, True)[:, 0, :].astype(float)
            if len(ap) < 3: continue
            holes = []
            j = hier[i][2]
            while j != -1:
                h = cv2.approxPolyDP(cs[j], 1.0, True)[:, 0, :].astype(float)
                if len(h) >= 3 and cv2.contourArea(cs[j]) >= 9: holes.append(np.stack([C.X0 + h[:, 0] * 2, C.Y0 - h[:, 1] * 2], 1))
                j = hier[j][0]
            g = Polygon(np.stack([C.X0 + ap[:, 0] * 2, C.Y0 - ap[:, 1] * 2], 1), holes)
            if not g.is_valid: g = g.buffer(0)
            if g.is_empty: continue
            regs.append(dict(type='Feature', properties=dict(code=code, cls=NAMES[code], area_ha=round(g.area / 1e4, 3), meaning=DEFS[code]), geometry=mapping(to_ll(g.simplify(1.5)))))
            n += 1
        print('class', code, NAMES[code], 'polygons', n)
    fc2 = dict(type='FeatureCollection', name='changed_regions', properties=dict(label='RECONSTRUCTION: regions of the photograph that were changed (or deliberately kept although ambiguous). Polygons are the 2 m raster outlines.'), features=regs)
    with gzip.open(os.path.join(C.PROV, 'changed_regions.geojson.gz'), 'wt', encoding='utf-8') as f:
        json.dump(fc2, f, separators=(',', ':'))
    json.dump(dict(classes={str(k): dict(name=NAMES[k], meaning=DEFS[k]) for k in NAMES}, label='RECONSTRUCTION, not a photograph of 1863'), open(os.path.join(C.PROV, 'classes.json'), 'w'), indent=1)
    print('regions', len(regs), 'files', {f: os.path.getsize(os.path.join(C.PROV, f)) for f in os.listdir(C.PROV) if os.path.isfile(os.path.join(C.PROV, f))})

if __name__ == '__main__':
    main()
