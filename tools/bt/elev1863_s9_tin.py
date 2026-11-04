"""Stage 9: the Warren TIN raster over the TRUSTED contours, its residual against the modern DEM, and the coverage numbers.

Trusted contour = level assigned (stage 8 / elev1863_levels.py) within 6 graph hops of a printed label, and (if two or more anchors voted)
vote spread <= 8 ft.  Elevation of a vertex = K + 0.3048 * level_ft  (K: datum calibration from the margin labels, error_model.json).
TIN = Delaunay triangulation of the vertices (every 3 px along each trusted contour, positions from the chosen FFD frame); linear
interpolation; a cell is VALID only if it lies in a triangle whose edges are all <= 90 m and within 60 m of a trusted contour vertex.
Outputs (EPSG:32618, 1 m, DEM grid):
  warren_tin_1863.tif   float32 metres (NAVD88 equivalent via K), nodata -9999
  warren_grade.tif      uint8: 0 none, 1 hop 0 (labelled contour), 2 hop 1-3, 3 hop 4-6  (worst grade among the 3 vertices)
  warren_minus_dem.tif  float32 metres, Warren TIN minus modern 3DEP (positive: Warren higher), nodata -9999
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s9_tin.py
"""
import os
import sys
import json
import pickle
import numpy as np
import cv2
import rasterio
from rasterio.transform import from_origin
from scipy.spatial import Delaunay, cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import elev1863_s5_levels as S5
import elev1863_s7_points as S7
import pyproj
import shapely.geometry as sg
import shapely.ops as so

FT = 0.3048
FRAME = 'ffd'


def trusted_mask(fl):
    z, hop, nv, spread = fl['z'], fl['hop'], fl['nvotes'], fl['spread']
    ok = np.isfinite(z) & (hop >= 0) & (hop <= 6)
    ok &= ~((nv >= 2) & (spread > 8))
    return ok


def main():
    frags = S5.load_fragments()
    fl = pickle.load(open(os.path.join(C.CACHE, 'final_levels.pkl'), 'rb'))
    K = fl['K']
    ok = trusted_mask(fl)
    px2utm = C.load_frame(FRAME)[0]
    pts = []
    grade = []
    fid = []
    for i, c in enumerate(frags):
        if not ok[i]:
            continue
        p = c['pts'][::3]
        E, N = px2utm(p[:, 0], p[:, 1])
        z = K + FT * fl['z'][i]
        pts.append(np.stack([E, N, np.full(len(E), z)], 1))
        g = 1 if fl['hop'][i] == 0 else (2 if fl['hop'][i] <= 3 else 3)
        grade.append(np.full(len(E), g, np.uint8))
        fid.append(np.full(len(E), i, np.int32))
    P = np.concatenate(pts)
    G = np.concatenate(grade)
    Fi = np.concatenate(fid)
    print('trusted fragments', int(ok.sum()), 'vertices', len(P))
    tri = Delaunay(P[:, :2])
    simp = tri.simplices
    # long edges -> invalid triangles
    a, b, c = P[simp[:, 0], :2], P[simp[:, 1], :2], P[simp[:, 2], :2]
    el = np.maximum.reduce([np.hypot(*(a - b).T), np.hypot(*(b - c).T), np.hypot(*(c - a).T)])
    tri_ok = el <= 90.0
    tgrade = np.maximum.reduce([G[simp[:, 0]], G[simp[:, 1]], G[simp[:, 2]]])
    tree = cKDTree(P[:, :2])
    dem = rasterio.open(C.DEM).read(1)
    H, W = dem.shape
    out_z = np.full((H, W), -9999, np.float32)
    out_g = np.zeros((H, W), np.uint8)
    # bounding rows of data
    r0 = max(0, int(C.DEM_Y0 - P[:, 1].max()) - 70)
    r1 = min(H, int(C.DEM_Y0 - P[:, 1].min()) + 70)
    c0 = max(0, int(P[:, 0].min() - C.DEM_X0) - 70)
    c1 = min(W, int(P[:, 0].max() - C.DEM_X0) + 70)
    for rs in range(r0, r1, 400):
        re_ = min(r1, rs + 400)
        cols = np.arange(c0, c1)
        rows = np.arange(rs, re_)
        Ee, Nn = np.meshgrid(C.DEM_X0 + cols + 0.5, C.DEM_Y0 - rows - 0.5)
        q = np.stack([Ee.ravel(), Nn.ravel()], 1)
        d, _ = tree.query(q, distance_upper_bound=60.0)
        near = np.isfinite(d)
        if not near.any():
            continue
        qi = np.where(near)[0]
        s = tri.find_simplex(q[qi])
        inside = s >= 0
        qi, s = qi[inside], s[inside]
        good = tri_ok[s]
        qi, s = qi[good], s[good]
        # barycentric interpolation
        T = tri.transform[s]
        bary2 = np.einsum('ijk,ik->ij', T[:, :2, :], q[qi] - T[:, 2, :])
        bary = np.concatenate([bary2, 1 - bary2.sum(1, keepdims=True)], 1)
        zz = (P[simp[s], 2] * bary).sum(1)
        rr = qi // len(cols)
        cc = qi % len(cols)
        out_z[rs + rr, c0 + cc] = zz.astype(np.float32)
        out_g[rs + rr, c0 + cc] = tgrade[s]
    meta = dict(driver='GTiff', height=H, width=W, count=1, crs='EPSG:32618', transform=from_origin(C.DEM_X0, C.DEM_Y0, 1.0, 1.0), compress='deflate', tiled=True)
    with rasterio.open(os.path.join(C.OUT, 'warren_tin_1863.tif'), 'w', dtype='float32', nodata=-9999, **meta) as ds:
        ds.write(out_z, 1)
    with rasterio.open(os.path.join(C.OUT, 'warren_grade.tif'), 'w', dtype='uint8', nodata=0, **meta) as ds:
        ds.write(out_g, 1)
    res = np.where(out_z > -9000, out_z - dem, -9999).astype(np.float32)
    with rasterio.open(os.path.join(C.OUT, 'warren_minus_dem.tif'), 'w', dtype='float32', nodata=-9999, **meta) as ds:
        ds.write(res, 1)
    valid = out_z > -9000
    print('TIN cells', int(valid.sum()), 'km2', valid.sum() / 1e6)
    # coverage numbers
    tr = pyproj.Transformer.from_crs(4326, 32618, always_xy=True)
    proto = sg.box(*tr.transform(-77.272, 39.783), *tr.transform(-77.2, 39.838))
    sheet_px = np.array([[417, 833], [8477, 833], [8477, 9397], [417, 9397]], float)
    E, N = px2utm(sheet_px[:, 0], sheet_px[:, 1])
    sheet = sg.Polygon(np.stack([E, N], 1))
    # rasterise polygons on the DEM grid at 4 m for speed
    f = 4
    def poly_mask(poly):
        m = np.zeros((H // f, W // f), np.uint8)
        xy = np.array(poly.exterior.coords)
        px = ((xy[:, 0] - C.DEM_X0) / f).astype(np.int32)
        py = ((C.DEM_Y0 - xy[:, 1]) / f).astype(np.int32)
        cv2.fillPoly(m, [np.stack([px, py], 1).reshape(-1, 1, 2)], 1)
        return m.astype(bool)
    proto_m = poly_mask(proto if proto.geom_type == 'Polygon' else proto.convex_hull)
    sheet_m = poly_mask(sheet)
    v4 = valid[:H // f * f, :W // f * f].reshape(H // f, f, W // f, f).mean((1, 3)) > 0.5
    # extraction coverage: cells within 30 m of ANY extracted contour fragment (all 9750), and of trusted
    allm = np.zeros((H // f, W // f), np.uint8)
    for c in frags:
        E, N = px2utm(c['pts'][::4, 0], c['pts'][::4, 1])
        px = ((E - C.DEM_X0) / f).astype(np.int32)
        py = ((C.DEM_Y0 - N) / f).astype(np.int32)
        cv2.polylines(allm, [np.stack([px, py], 1).reshape(-1, 1, 2)], False, 1, 1)
    from scipy import ndimage as ndi
    ext30 = ndi.distance_transform_edt(allm == 0) * f <= 30
    cov = {}
    for name, m in (('warren_sheet_inner_neatline', sheet_m), ('battle_theatre_prototype_box', proto_m)):
        area = m.sum() * f * f / 1e6
        cov[name] = {'area_km2': float(area),
                     'inside_warren_sheet_km2': float((m & sheet_m).sum() * f * f / 1e6),
                     'share_inside_warren_sheet': float((m & sheet_m).sum() / m.sum()),
                     'contours_extracted_within_30m_share': float((m & ext30).sum() / m.sum()),
                     'trusted_warren_tin_share': float((m & v4).sum() / m.sum()),
                     'trusted_warren_tin_km2': float((m & v4).sum() * f * f / 1e6)}
    cov['trusted_fragments'] = int(ok.sum())
    cov['extracted_fragments'] = len(frags)
    json.dump(cov, open(os.path.join(C.OUT, 'coverage.json'), 'w'), indent=1)
    print(json.dumps(cov, indent=1))


if __name__ == '__main__':
    main()
