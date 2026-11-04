"""Stage 10: de-modernization polygons (PDF B.9.2 step 2), edits, unexplained residuals, candidate surface and provenance raster.

CANDIDATE polygons (post-1863 disturbance that the project's existing layers document or classify):
  AVE   NPS memorial avenues (TIGER edges class NPS_MEMORIAL_AVENUE in features/roads-rail-water/modern-roads-remove.csv), buffer 15 m.
        reason/source: NPS Cultural Landscapes Inventory pages quoted in SOURCES-roads.md section 4 (dates of construction, 1882-1920).
  US15  US 15 bypass (opened 28 June 1963), buffer 45 m (AARoads, as cited in modern-roads-remove.csv; a LEAD per the Law, hence tier inferred).
  QRY   MOD-QUARRY_LANDFILL-00001 and modern water polygons (modern/data/terrain_candidates.geojson.gz).
  RDC   road cut / fill candidates (same file) on roads that the roads catalogue classifies as post-1863 (street/drive/avenue/ramp), buffer 12 m.
  PRK   PARKING polygons (OSM, modern/data/inventory_features.geojson.gz): class rule 'all paved lots are post-1863' (MODERN-FEATURES.md).
  VC    the largest named visitor-centre / museum building footprints (OSM names) buffer 20 m.
Evaluation against the Warren TIN (trusted cells only):
  Regional bias (datum K, frame shift, level errors) is common to the polygon and its surroundings, so the test is LOCAL CONTRAST:
  contrast = median(Warren - modern inside the polygon) - median(same in the ring 50-150 m outside it, trusted cells only).
  an EDIT is applied only if  n_valid >= 300 inside AND >= 300 in the ring AND |contrast| >= the placebo 95th percentile (6.0 m, see placebo_test.json) AND >= 65 percent of inside cells lie on the
  same side of the ring median as the contrast.  Edit = low-pass (sigma 15 m, masked) difference Warren TIN minus lidar MINUS the ring median
  (the regional bias is removed, not imposed), cosine feather over 8 m inside the polygon edge; lidar fine detail is kept.
Polygons not edited are reported with the reason (no coverage / not resolvable / sign not consistent) and flagged in disturbance_unedited.tif.
UNEXPLAINED residual regions: 25 m-smoothed |Warren - modern| >= 6 m (about p95 of the measured flat/slope error) in contiguous regions >= 1 ha
  that are not inside any candidate polygon; each is tested for a horizontal-registration explanation (best shift +-40 m) and logged, never edited.
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s10_polygons.py
"""
import os
import sys
import csv
import gzip
import json
import numpy as np
import cv2
import rasterio
from rasterio.transform import from_origin
from rasterio.features import rasterize
from scipy import ndimage as ndi
import shapely
import shapely.geometry as sg
import shapely.ops as so
import pyproj
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C

MIN_CELLS = 300
def _threshold():
    # |contrast| threshold = 95th percentile of the placebo test (placebo_test.json: same rule on polygons shifted 250-450 m off the
    # documented disturbance), so that ordinary ground passes at most 5 percent of the time.  6.0 m is the value measured on 2026-10-19.
    f = os.path.join(C.OUT, 'placebo_test.json')
    try:
        return float(json.load(open(f))['abs_contrast_percentiles_m']['95'])
    except Exception:
        return 6.0


MIN_MED = _threshold()
MIN_SIGN = 0.65
FEATHER = 8.0
SIG = 15.0
UNEXPL_THR = 6.0
UNEXPL_MIN_HA = 1.0


def load_candidates():
    tr = pyproj.Transformer.from_crs(4326, 32618, always_xy=True)
    to_utm = lambda g: shapely.transform(g, lambda a: np.stack(tr.transform(a[:, 0], a[:, 1]), 1))
    cands = []
    # TIGER edges (already UTM)
    tg = {}
    for f in ('primary', 'secondary', 'local'):
        for ft in json.load(open(os.path.join(C.ROOT, 'tmp', 'b1863', 'maps', 'ref', f'tiger_{f}.geojson')))['features']:
            tg[str(ft['properties']['OID'])] = sg.shape(ft['geometry'])
    rows = list(csv.DictReader(open(os.path.join(C.B, 'features', 'roads-rail-water', 'modern-roads-remove.csv'), encoding='utf-8')))
    post = []
    us15_seg = [0]
    for r in rows:
        g = tg.get(r['tiger_linearid'])
        if g is None:
            continue
        if r['cls'] == 'NPS_MEMORIAL_AVENUE':
            cands.append({'kind': 'AVE', 'geom': g.buffer(15), 'name': r['name'] or '(unnamed avenue segment)', 'src_id': 'TIGER ' + r['tiger_linearid'],
                          'reason': 'NPS memorial avenue (graded and surfaced 1882-1920)',
                          'source': ('NPS Cultural Landscapes Inventory: Gettysburg Landscape, as quoted in docs/basemap1863/SOURCES-roads.md section 4 '
                                     '(CLI Little Round Top p64-67; CLI Emmitsburg Road Ridge p89-92; CLI Pickett\'s Charge p88-90; CLI First Day p62)'),
                          'tier': 'inferred',
                          'tier_note': 'dating of the avenue is documented (NPS, type B); that its construction changed the ground surface by an amount the lidar shows is inferred'})
        elif r['cls'] == 'EXPRESSWAY_US15':
            lines = list(g.geoms) if g.geom_type == 'MultiLineString' else [g]
            for ln in lines:
                L = ln.length
                for s0 in np.arange(0, L, 250.0):
                    piece = so.substring(ln, s0, min(L, s0 + 250.0))
                    if piece.length < 20:
                        continue
                    us15_seg[0] += 1
                    seg = us15_seg[0]
                    cands.append({'kind': 'US15', 'geom': piece.buffer(45), 'name': r['name'] + ' segment %d' % seg, 'src_id': 'TIGER %s seg %d' % (r['tiger_linearid'], seg),
                                  'reason': 'US 15 Gettysburg bypass, opened 28 June 1963 (pavement, embankments, interchanges)',
                                  'source': r['evidence'], 'tier': 'inferred', 'tier_note': 'AARoads wiki is a lead, not a documented source (Law item 4)'})
        if r['cls'] in ('NPS_MEMORIAL_AVENUE', 'POST_1863_STREET_OR_DRIVE', 'EXPRESSWAY_US15', 'RAMP_OR_TURN_LANE', 'PRIVATE_DRIVE', 'PARKING_LOT_ROAD'):
            post.append(g)
    postu = so.unary_union(post) if post else None
    tc = json.load(gzip.open(os.path.join(C.B, 'modern', 'data', 'terrain_candidates.geojson.gz')))
    n_rd_old = 0
    for ft in tc['features']:
        p = ft['properties']
        g = to_utm(sg.shape(ft['geometry']))
        if p['kind'] in ('quarry_landfill', 'water_modern'):
            cands.append({'kind': 'QRY', 'geom': g, 'name': p.get('sub'), 'src_id': p['id'],
                          'reason': 'modern quarry / engineered water body (%s), measured ring-versus-inside depth %s m' % (p.get('sub'), p.get('depth_m')),
                          'source': 'docs/basemap1863/modern/results/terrain_changes.json (3DEP ring-versus-inside, error %s m); existence/date of the feature: OSM/NHD class only' % p.get('error_m'),
                          'tier': 'inferred', 'tier_note': 'a modern engineered basin is post-1863 by class rule; no dated source read'})
        elif p['kind'] in ('road_cut', 'road_fill'):
            if postu is not None and g.distance(postu) < 12:
                cands.append({'kind': 'RDC', 'geom': g.buffer(12), 'name': p.get('name') or p['road_srcid'], 'src_id': p['id'],
                              'reason': '%s on a road class post-1863 (street/drive/avenue/ramp): lidar cross-profile estimate %.1f m median' % (p['kind'], p['median_h_m']),
                              'source': 'terrain_changes.json / terrain_candidates.geojson.gz (3DEP 1 m, error %s m) + roads classification in modern-roads-remove.csv' % p.get('error_m'),
                              'tier': 'inferred', 'tier_note': 'the road is post-1863 by the project classification (period-map and NPS checks); the depth is a straight-line estimate'})
            else:
                n_rd_old += 1
    inv = json.load(gzip.open(os.path.join(C.B, 'modern', 'data', 'inventory_features.geojson.gz')))
    for ft in inv['features']:
        p = ft['properties']
        if p['cls'] == 'PARKING' and ft['geometry']['type'] == 'Polygon':
            cands.append({'kind': 'PRK', 'geom': to_utm(sg.shape(ft['geometry'])), 'name': p.get('name') or 'parking lot', 'src_id': p['id'],
                          'reason': 'paved parking lot (class rule: all paved lots are post-1863)',
                          'source': 'docs/basemap1863/modern/MODERN-FEATURES.md section 1 (OSM %s)' % p.get('srcid'), 'tier': 'inferred',
                          'tier_note': 'existence after 1863 by class rule; graded pad depth not documented'})
        if p['cls'] == 'BUILDING' and ft['geometry']['type'] == 'Polygon' and p.get('name') and any(k in p['name'].lower() for k in ('visitor', 'museum', 'cyclorama')):
            g = to_utm(sg.shape(ft['geometry']))
            if g.area > 1500:
                cands.append({'kind': 'VC', 'geom': g.buffer(20), 'name': p['name'], 'src_id': p['id'], 'reason': 'modern visitor centre / museum / cyclorama building pad',
                              'source': 'OSM building name %s' % p.get('srcid'), 'tier': 'inferred', 'tier_note': 'building is modern; pad grading depth not documented'})
    return cands, n_rd_old


def mnconv(a, valid, sigma):
    """masked normalised Gaussian smoothing"""
    w = valid.astype(np.float32)
    num = ndi.gaussian_filter(np.where(valid, a, 0).astype(np.float32), sigma, mode='constant')
    den = ndi.gaussian_filter(w, sigma, mode='constant')
    return np.where(den > 0.05, num / np.maximum(den, 1e-6), np.nan)


def main():
    dem_ds = rasterio.open(C.DEM)
    tin_ds = rasterio.open(os.path.join(C.OUT, 'warren_tin_1863.tif'))
    H, W = dem_ds.height, dem_ds.width
    dem = dem_ds.read(1).astype(np.float32)
    tin = tin_ds.read(1)
    valid = tin > -9000
    res = np.where(valid, tin - dem, np.nan).astype(np.float32)
    cands, n_old = load_candidates()
    print('candidates', len(cands), 'road cut/fill candidates on 1863-era roads not attributed:', n_old)
    transform = from_origin(C.DEM_X0, C.DEM_Y0, 1.0, 1.0)
    out_dem = dem.copy()
    prov = np.full((H, W), 2, np.uint8)
    prov[valid] = 0
    dist_flag = np.zeros((H, W), np.uint8)
    polys = []
    edit_alpha_total = np.zeros((H, W), np.float32)
    edit_delta = np.zeros((H, W), np.float32)
    lp_t = mnconv(np.where(valid, tin, 0), valid, SIG)
    lp_d = mnconv(dem, valid, SIG)
    explained = np.zeros((H, W), bool)
    for k, c in enumerate(cands):
        g = c['geom']
        if g.is_empty:
            continue
        minx, miny, maxx, maxy = g.bounds
        c0 = max(0, int(minx - C.DEM_X0) - 2)
        c1 = min(W, int(maxx - C.DEM_X0) + 3)
        r0 = max(0, int(C.DEM_Y0 - maxy) - 2)
        r1 = min(H, int(C.DEM_Y0 - miny) + 3)
        if c1 <= c0 or r1 <= r0:
            continue
        tf = from_origin(C.DEM_X0 + c0, C.DEM_Y0 - r0, 1.0, 1.0)
        m = rasterize([(g, 1)], out_shape=(r1 - r0, c1 - c0), transform=tf, fill=0, dtype='uint8').astype(bool)
        if m.sum() == 0:
            continue
        explained[r0:r1, c0:c1] |= m
        v = valid[r0:r1, c0:c1] & m
        n_valid = int(v.sum())
        rec = {'id': 'DM-%04d' % (k + 1), 'kind': c['kind'], 'name': c['name'], 'source_feature_id': c['src_id'], 'reason': c['reason'], 'source': c['source'],
               'evidence_tier': c['tier'], 'tier_note': c['tier_note'], 'area_m2': float(g.area), 'n_cells': int(m.sum()), 'n_valid_warren_cells': n_valid,
               'geometry_wkt_utm18n': g.simplify(1.0).wkt}
        if n_valid:
            r = res[r0:r1, c0:c1][v]
            med = float(np.median(r))
            # ring 50-150 m outside the polygon (trusted cells), read from a padded window
            pad = 150
            a0, a1, b0, b1 = max(0, r0 - pad), min(H, r1 + pad), max(0, c0 - pad), min(W, c1 + pad)
            mm = np.zeros((a1 - a0, b1 - b0), bool)
            mm[r0 - a0:r1 - a0, c0 - b0:c1 - b0] = m
            dd = ndi.distance_transform_edt(~mm)
            ringm = (dd > 50) & (dd <= 150) & valid[a0:a1, b0:b1]
            nring = int(ringm.sum())
            rec['residual_warren_minus_modern_m'] = {'median': med, 'mean': float(r.mean()), 'p05': float(np.percentile(r, 5)), 'p95': float(np.percentile(r, 95)), 'n_ring_cells': nring}
            if nring >= MIN_CELLS:
                rmed = float(np.median(res[a0:a1, b0:b1][ringm]))
                contrast = med - rmed
                sgn = float((np.sign(r - rmed) == np.sign(contrast)).mean())
                rec['residual_warren_minus_modern_m'].update({'ring_median': rmed, 'contrast': contrast, 'same_sign_share': sgn})
        applied = False
        if n_valid < MIN_CELLS:
            rec['edit_applied'] = None
            rec['edit_decision'] = 'NOT EDITED: outside the trusted Warren surface (%d valid cells, need %d)' % (n_valid, MIN_CELLS)
            dist_flag[r0:r1, c0:c1] |= m.astype(np.uint8)
        else:
            rr = rec['residual_warren_minus_modern_m']
            if 'contrast' not in rr:
                rec['edit_applied'] = None
                rec['edit_decision'] = 'NOT EDITED: no trusted Warren ring around the polygon (%d ring cells, need %d), so local contrast cannot be separated from regional bias' % (rr['n_ring_cells'], MIN_CELLS)
                dist_flag[r0:r1, c0:c1] |= m.astype(np.uint8)
                polys.append(rec)
                continue
            if abs(rr['contrast']) >= MIN_MED and rr['same_sign_share'] >= MIN_SIGN:
                # feathered offset
                dist = ndi.distance_transform_edt(m)
                w = np.clip(dist / FEATHER, 0, 1)
                w = 0.5 - 0.5 * np.cos(np.pi * w)
                off = (lp_t[r0:r1, c0:c1] - lp_d[r0:r1, c0:c1]) - rr['ring_median']
                use = m & valid[r0:r1, c0:c1] & np.isfinite(off)
                add = np.where(use, w * off, 0).astype(np.float32)
                # keep the largest-magnitude correction when polygons overlap (no double application)
                cur = edit_delta[r0:r1, c0:c1]
                sel = np.abs(add) > np.abs(cur)
                cur[sel] = add[sel]
                edit_delta[r0:r1, c0:c1] = cur
                prov[r0:r1, c0:c1][use & (w > 0)] = 1
                applied = True
                rec['edit_applied'] = {'method': 'low-pass (sigma %.0f m, masked) difference Warren TIN minus lidar, cosine feather %.0f m inside edge; lidar detail kept' % (SIG, FEATHER),
                                       'mean_offset_m': float(add[use].mean()), 'max_abs_offset_m': float(np.abs(add[use]).max()), 'cells_edited': int((use & (w > 0)).sum())}
                rec['edit_decision'] = 'EDITED toward Warren (|local contrast| %.2f m >= %.1f, same side %.0f percent)' % (abs(rr['contrast']), MIN_MED, 100 * rr['same_sign_share'])
            else:
                rec['edit_applied'] = None
                why = []
                if abs(rr['contrast']) < MIN_MED:
                    why.append('|local contrast| %.2f m below the threshold %.1f m (Warren cannot resolve it)' % (abs(rr['contrast']), MIN_MED))
                if rr['same_sign_share'] < MIN_SIGN:
                    why.append('residual sign not consistent (%.0f percent)' % (100 * rr['same_sign_share']))
                rec['edit_decision'] = 'NOT EDITED: ' + '; '.join(why)
                dist_flag[r0:r1, c0:c1] |= m.astype(np.uint8)
        polys.append(rec)
    out_dem = dem + edit_delta
    # unexplained residual regions
    sm = mnconv(np.nan_to_num(res, nan=0), valid, 12.0)       # ~25 m window
    big = np.isfinite(sm) & (np.abs(sm) >= UNEXPL_THR) & valid
    big &= ~ndi.binary_dilation(explained, iterations=15)
    lab, n = ndi.label(big)
    sizes = ndi.sum(big, lab, range(1, n + 1))
    regions = []
    objs = ndi.find_objects(lab)
    # horizontal-shift diagnostic needs slope: use DEM gradient
    gy, gx = np.gradient(ndi.gaussian_filter(dem, 3.0))
    for i in range(n):
        if sizes[i] < UNEXPL_MIN_HA * 1e4:
            continue
        sl = objs[i]
        m = lab[sl] == i + 1
        rr = sm[sl][m]
        ys, xs = np.nonzero(m)
        cy, cx = sl[0].start + ys.mean(), sl[1].start + xs.mean()
        # explanatory test: is the residual consistent with the DEM slope times a horizontal shift (d = r / slope . shift)?  least squares for (dx, dy)
        A = np.stack([np.ones(m.sum()), gx[sl][m], -gy[sl][m]], 1)         # constant + horizontal shift (dE, dN); image y is down
        sol, *_ = np.linalg.lstsq(A, rr, rcond=None)
        pred = A[:, 1:] @ sol[1:]
        rc = rr - rr.mean()
        r2 = 1 - ((rc - (pred - pred.mean())) ** 2).sum() / max((rc ** 2).sum(), 1e-9)
        shift = float(np.hypot(sol[1], sol[2]))
        steps = float(np.median(rr) / (4 * C.FT))
        E = C.DEM_X0 + cx
        N = C.DEM_Y0 - cy
        vals = np.nan_to_num(res)[sl][m]
        regions.append({'id': 'UR-%03d' % (len(regions) + 1), 'area_ha': float(sizes[i] / 1e4), 'centroid_E_N_utm18n': [float(E), float(N)],
                        'bbox_rows_cols': [int(sl[0].start), int(sl[0].stop), int(sl[1].start), int(sl[1].stop)],
                        'residual_warren_minus_modern_m': {'median': float(np.median(vals)), 'p05': float(np.percentile(vals, 5)), 'p95': float(np.percentile(vals, 95))},
                        'registration_shift_test': {'best_dE_m': float(sol[1]), 'best_dN_m': float(sol[2]), 'variance_explained_of_within_region_variation': float(r2),
                                                    'uniform_offset_in_4ft_contour_steps': steps,
                                                    'reading': ('within-region variation is explained %.0f percent by a horizontal displacement of about %.0f m (the sheet is locally distorted by up to 25 m); '
                                                                'the region-wide offset itself (%.1f m = %.1f contour intervals) is not a horizontal effect' % (100 * r2, shift, np.median(rr), steps)) if (r2 > 0.4 and shift < 45)
                                                    else ('near-uniform offset of %.1f m (= %.1f contour intervals of 4 ft) over the region: HYPOTHESIS, not established: a contour-level assignment error '
                                                          'in this stretch, or a datum/regional effect; not a horizontal shift' % (np.median(rr), steps))},
                        'cause_assigned': None, 'status': 'UNEXPLAINED (not edited; no documented post-1863 disturbance covers it)'})
    regions.sort(key=lambda r: -r['area_ha'])
    for i, r in enumerate(regions):
        r['id'] = 'UR-%03d' % (i + 1)
    ur = {'what': 'Warren-minus-modern residual regions that no documented disturbance polygon explains. Never edited. Never overwritten: new runs write unexplained_residuals_runN.json when this file exists.',
          'criteria': {'smoothed_abs_residual_m': UNEXPL_THR, 'min_area_ha': UNEXPL_MIN_HA, 'smoothing': '25 m window', 'excluded': 'within 15 m of any candidate polygon'},
          'count': len(regions), 'regions': regions}
    path = os.path.join(C.OUT, 'unexplained_residuals.json')
    if os.path.exists(path):
        k = 2
        while os.path.exists(os.path.join(C.OUT, 'unexplained_residuals_run%d.json' % k)):
            k += 1
        path = os.path.join(C.OUT, 'unexplained_residuals_run%d.json' % k)
    json.dump(ur, open(path, 'w'), indent=1)
    meta = dict(driver='GTiff', height=H, width=W, count=1, crs='EPSG:32618', transform=transform, compress='deflate', tiled=True)
    # stored as uint16 in 5 cm steps (value * 0.05 = metres NAVD88; 0 = nodata) to keep the file near 40 MB; a float32 copy is 230-340 MB
    meta16 = dict(meta, predictor=2, zlevel=9)
    with rasterio.open(os.path.join(C.OUT, 'dem_1863_candidate.tif'), 'w', dtype='uint16', nodata=0, **meta16) as ds:
        ds.write(np.round(np.nan_to_num(out_dem, nan=0.0) * 20).astype(np.uint16), 1)
        ds.scales = (0.05,)
        ds.offsets = (0.0,)
        ds.update_tags(units='metres = DN * 0.05', note='modern 3DEP 1 m edited only inside documented polygons (provenance raster); NOT a verified 1863 surface')
    with rasterio.open(os.path.join(C.OUT, 'dem_1863_provenance.tif'), 'w', dtype='uint8', **meta) as ds:
        ds.write(prov, 1)
    with rasterio.open(os.path.join(C.OUT, 'disturbance_unedited.tif'), 'w', dtype='uint8', nodata=0, **meta) as ds:
        ds.write(dist_flag, 1)
    summ = {'n_polygons': len(polys), 'by_kind': {}, 'edited': sum(1 for p in polys if p['edit_applied']),
            'not_edited_no_coverage': sum(1 for p in polys if p['edit_applied'] is None and 'outside the trusted' in p['edit_decision']),
            'not_edited_unresolved': sum(1 for p in polys if p['edit_applied'] is None and 'outside the trusted' not in p['edit_decision']),
            'unexplained_regions': len(regions), 'unexplained_area_ha': float(sum(r['area_ha'] for r in regions)),
            'provenance_cells': {'0_trusted_warren_lidar_kept': int((prov == 0).sum()), '1_blended': int((prov == 1).sum()), '2_outside_trusted_warren': int((prov == 2).sum())},
            'road_cut_fill_candidates_on_1863_era_roads_not_attributed': n_old,
            'thresholds': {'min_cells': MIN_CELLS, 'min_abs_median_m': MIN_MED, 'min_same_sign': MIN_SIGN, 'feather_m': FEATHER, 'lowpass_sigma_m': SIG}}
    for p in polys:
        summ['by_kind'].setdefault(p['kind'], {'n': 0, 'edited': 0, 'with_coverage': 0})
        summ['by_kind'][p['kind']]['n'] += 1
        summ['by_kind'][p['kind']]['edited'] += 1 if p['edit_applied'] else 0
        summ['by_kind'][p['kind']]['with_coverage'] += 1 if p['n_valid_warren_cells'] >= MIN_CELLS else 0
    json.dump({'summary': summ, 'polygons': polys}, open(os.path.join(C.OUT, 'demodernization_polygons.json'), 'w'), indent=1)
    print(json.dumps(summ, indent=1))


if __name__ == '__main__':
    main()
