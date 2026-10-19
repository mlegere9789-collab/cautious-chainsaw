"""Write all land-cover GeoJSON files (EPSG:4326 + EPSG:3857 copies) and the change layers."""
import json, os, sys, hashlib, datetime
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from build_features import *   # noqa
from rasterize import rasterize, X0, Y1
from change_map import vectorize
ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))

TOWN_PX = Polygon([(4800, 3380), (5750, 3380), (5980, 3700), (5980, 4350), (5500, 4520), (4800, 4400)])


def main():
    feats, ANCH = build()
    names = {'woods': 'woods_1863', 'orchards': 'orchards_1863', 'scattered_trees': 'scattered_trees_1863', 'marsh_wetland': 'marsh_wetland_1863',
             'boulder_fields': 'boulder_fields_1863', 'fields_documented': 'fields_documented_1863', 'open_cleared': 'open_cleared_1863'}
    # --- tree cover union (1863) for change layers
    tree_polys = [f['_utm_geom'] for k in ('woods', 'orchards', 'scattered_trees') for f in feats[k]]
    T63 = unary_union([p.buffer(0) for p in tree_polys])
    wet = unary_union([f['_utm_geom'] for f in feats['marsh_wetland']] + [f['_utm_geom'] for f in feats['boulder_fields']])
    town = px_poly_to_utm(TOWN_PX).buffer(0)
    # --- open ground = coverage minus tree cover, wetland, boulders, cleared slope (kept separate), field (kept separate), town
    other = unary_union([T63, wet, town] + [f['_utm_geom'] for k in ('fields_documented', 'open_cleared') for f in feats[k]])
    OG = COVER_UTM.difference(other.buffer(0.01)).buffer(0)
    og_feats = []
    for q in clean(OG, tol=2.0, minarea=2000):
        og_feats.append(make('LC-OG-%04d' % (len(og_feats) + 1), 'open_ground', 'open_farmland_unclassified', None, q, True,
                             'Inside the Warren sheet and outside every mapped woodlot, orchard, tree cluster, wetland, boulder field and the town: open ground (field, meadow, pasture or crop) in 1868-69.',
                             [WARREN_SRC('No tree, orchard or marsh symbols; fence-bounded fields.')],
                             'Complement of the mapped classes inside the Warren neatline, minus the built-up town block.',
                             40, 'Estimated',
                             'Crop or pasture type per field is UNKNOWN (see crops_unknown_1863.json). July 1863 default look: standing wheat golden-tan, hay and pasture green to straw, young corn green, some bare plough or stubble. Roads, fences and buildings are NOT removed from this polygon (other layers).'))
    feats['open_ground'] = og_feats
    names['open_ground'] = 'open_ground_1863'
    cov = make('LC-COVER-0001', 'coverage', 'warren_neatline', 'Warren survey sheet coverage (inner frame)', COVER_UTM, True,
               'Only this area is described by the 1868-69 survey; outside it the 1863 land cover is UNKNOWN.',
               [WARREN_SRC('Neatline of the sheet.')], 'Inner frame of the sheet located in the scan and transformed with the Warren georeference.', 30, 'Documented', 'Not a land-cover class.')
    feats['coverage'] = [cov]
    names['coverage'] = 'coverage_warren_sheet'
    town_f = make('LC-TOWN-0001', 'excluded_zone', 'built_up_town_block', 'Gettysburg built-up block (excluded from land cover; handled by the structures layer)', town, True, 'Town existed in 1863.',
                  [WARREN_SRC('Dense building symbols and street grid.')], 'Hand outline of the Warren-sheet town block.', 60, 'Estimated', 'Yard trees and street trees inside the block are UNKNOWN in 1863.')
    feats['excluded_zone'] = [town_f]
    names['excluded_zone'] = 'excluded_town_zone'
    # --- change layers from lidar canopy
    d = np.load(os.path.join(ROOT, 'chm_final.npz'))
    chm = d['chm']; mf = d['mf']
    raw = ((chm > 4.0) & (mf > 0.08)).astype(np.uint8)
    cnt = cv2.boxFilter(raw.astype(np.float32), -1, (5, 5), normalize=False)
    canopy = (cnt >= 4).astype(np.uint8)
    canopy = cv2.morphologyEx(canopy, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    covm = rasterize([COVER_UTM]).astype(np.uint8)
    t63 = rasterize([T63]).astype(np.uint8)
    k12 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))   # 6 cells = 12 m tolerance
    t63_tol = cv2.dilate(t63, k12)
    rem = canopy & (1 - t63_tol) & covm
    rem = cv2.morphologyEx(rem, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    k6 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    can_tol = cv2.dilate(canopy, k6)
    add = t63 & (1 - can_tol) & covm
    add = cv2.morphologyEx(add, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    rem_polys = vectorize(rem, 300.0, tol=2.0)
    add_polys = vectorize(add, 500.0, tol=2.0)
    rf = []
    for g in rem_polys:
        ctr = g.representative_point()
        zone = 'town' if town.contains(ctr) else 'country'
        iy = int((Y1 - ctr.y) / 2.0); ix = int((ctr.x - X0) / 2.0)
        h = float(np.percentile(chm[max(0, iy - 3):iy + 4, max(0, ix - 3):ix + 4], 90))
        fid = 'LC-CHG-REM-%05d' % (len(rf) + 1)
        rf.append({'id': fid, 'category': 'change_remove_modern_canopy', 'subtype': 'modern_canopy_absent_in_1863', 'name': None,
                   'present_1863': False, 'period_note': 'Tree canopy measured by USGS 3DEP lidar (2017 acquisition) that lies outside every 1863 tree-cover polygon (mapped woods, orchards, tree clusters) plus a 12 m tolerance.',
                   'sources': [src('S-3DEP-LIDAR', 'EPT depth <= 10', 'Canopy height above 4 m with multi-return structure, smoothed to 2 m cells.'), WARREN_SRC('Open ground (no tree symbols) at this location on the Warren sheet.')],
                   'method': 'Modern canopy mask (lidar CHM > 4 m and multi-return fraction > 0.08, 5x5 majority) minus buffered 1863 tree cover, clipped to the Warren neatline, opened with a 3x3 element, polygons >= 300 m2.',
                   'positional_error_m': 30, 'confidence': 'Estimated',
                   'notes': 'Replace with the open-ground texture around it (field/pasture), not with bare soil. zone=%s: inside the town block the 1863 yard-tree cover is UNKNOWN. Canopy height here about %.0f m. Lidar is 2017; the base photograph chosen for the map may differ by a few years of tree growth.' % (zone, h),
                   'zone': zone, 'canopy_height_p90_m': round(h, 1), 'area_m2': round(g.area, 1), '_utm_geom': g})
    af = []
    for g in add_polys:
        fid = 'LC-CHG-ADD-%05d' % (len(af) + 1)
        af.append({'id': fid, 'category': 'change_add_1863_tree_cover', 'subtype': 'tree_cover_present_1863_open_now', 'name': None,
                   'present_1863': True, 'period_note': '1863 woods, orchards or tree clusters (Warren survey 1868-69) with no modern canopy within 6 m in the 2017 lidar.',
                   'sources': [WARREN_SRC('Tree symbols at this location.'), src('S-3DEP-LIDAR', 'EPT depth <= 10', 'No canopy above 4 m at this location in 2017.')],
                   'method': '1863 tree-cover union minus dilated modern canopy; polygons >= 500 m2.', 'positional_error_m': 30, 'confidence': 'Estimated',
                   'notes': 'Add leaf-on deciduous canopy (oak-hickory) or orchard trees as appropriate to the parent class; July leaf-on. Could also be a registration miss at a woodlot edge (about 20 to 30 m uncertainty).',
                   'area_m2': round(g.area, 1), '_utm_geom': g})
    feats['change_remove'] = rf
    feats['change_add'] = af
    names['change_remove'] = 'change_remove_modern_canopy'
    names['change_add'] = 'change_add_1863_tree_cover'
    counts = {}
    for k, nm in names.items():
        counts[nm] = write_fc(nm, feats[k])
    # stats
    stats = {'generated': datetime.datetime.utcnow().strftime('%Y-%m-%d'), 'counts': counts,
             'acres': {k: round(sum(f.get('area_m2', 0) for f in feats[k]) / ACRE, 1) for k in feats},
             'canopy_modern_frac_of_coverage': float(canopy[covm > 0].mean()), 'tree_cover_1863_frac_of_coverage': float(t63[covm > 0].mean()),
             'remove_area_ha': round(sum(f['area_m2'] for f in rf) / 1e4, 1), 'add_area_ha': round(sum(f['area_m2'] for f in af) / 1e4, 1),
             'remove_country_ha': round(sum(f['area_m2'] for f in rf if f['zone'] == 'country') / 1e4, 1)}
    json.dump(stats, open(os.path.join(ROOT, 'final_stats.json'), 'w'), indent=1)
    print(json.dumps(stats, indent=1))


if __name__ == '__main__':
    main()
