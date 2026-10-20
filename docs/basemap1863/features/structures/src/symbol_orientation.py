"""Orientation of the building symbols of the Warren plate (cw0353500), read from the plate itself.

The symbols of the plate are small solid rectangles drawn with the orientation of the building they stand for (not exactly to scale, but the long axis follows the building).
For every catalogue structure that has a plate position (`map_px_cw0325000a`) and is a point, the plate pixel is found through the inverse of
plate_cw0353500_to_cw0325000a_homography (features/structures/evidence/georef_comparison.json); the solid component (opening 6x6) nearest to it within 6 plate px is taken, its minimum-area
rectangle gives the long-axis direction, carried to the ground with the affine of maps/transforms/warren-1869.json (px_to_en.A).
Writes symbol_orientation.json: {id: {angle_deg (azimuth of the long axis in the UTM grid, degrees counter-clockwise from east, 0..180), aspect, area_plate_px}}.
Only blobs with aspect >= 1.25 are given an orientation (a square symbol says nothing about the ridge). Run from the repository root; needs tmp/b1863/maps/scans/cw0353500.jp2 (not committed).
"""
import json, os, sys, warnings
import numpy as np, cv2, rasterio
from rasterio.windows import Window
warnings.filterwarnings('ignore')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
FEAT = os.path.join(ROOT, 'docs', 'basemap1863', 'features', 'structures')
H = np.array(json.load(open(os.path.join(FEAT, 'evidence', 'georef_comparison.json')))['plate_cw0353500_to_cw0325000a_homography']); Hi = np.linalg.inv(H)
A = np.array(json.load(open(os.path.join(ROOT, 'docs', 'basemap1863', 'maps', 'transforms', 'warren-1869.json')))['px_to_en']['A'])
cat = json.load(open(os.path.join(FEAT, 'structures.geojson'), encoding='utf-8'))['features']
plate = rasterio.open(os.path.join(ROOT, 'tmp', 'b1863', 'maps', 'scans', 'cw0353500.jp2'))
R = 40
out = {}
for f in cat:
    p = f['properties']
    px = p.get('map_px_cw0325000a')
    if not px or not f['geometry'] or f['geometry']['type'] != 'Point':
        continue
    v = Hi @ np.array([px[0], px[1], 1.0]); cx, cy = int(v[0] / v[2]), int(v[1] / v[2])
    a = plate.read(window=Window(cx - R, cy - R, 2 * R, 2 * R), boundless=True, fill_value=255).mean(0)
    op = cv2.morphologyEx((a < 95).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (6, 6)))
    n, lab, st, cen = cv2.connectedComponentsWithStats(op)
    yy, xx = np.nonzero(op)
    if not len(yy):
        continue
    d = np.hypot(yy - R, xx - R); k = int(d.argmin())
    if d[k] > 6:
        continue
    m = (lab == lab[yy[k], xx[k]]).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    (rcx, rcy), (w, h), ang = cv2.minAreaRect(max(cs, key=cv2.contourArea))
    if min(w, h) < 3:
        continue
    aspect = max(w, h) / min(w, h)
    if aspect < 1.25:
        continue
    th = np.radians(ang if w >= h else ang + 90.0)
    u = np.array([np.cos(th), np.sin(th)])                    # long axis in plate px (x right, y down)
    g = A @ u                                                  # ground E, N
    az = (np.degrees(np.arctan2(g[1], g[0])) + 180.0) % 180.0
    out[p['id']] = dict(angle_deg=round(float(az), 1), aspect=round(float(aspect), 2), area_plate_px=int(m.sum()))
json.dump(out, open(os.path.join(FEAT, 'symbol_orientation.json'), 'w'), indent=0)
print(len(out), 'orientations of', sum(1 for f in cat if f['properties'].get('map_px_cw0325000a')))
