"""vecover.py <a|loc94> cx cy half Z dx dy out.jpg : crop of a July 1 scan centred on scan px (cx,cy) with MODERN vectors (Adams County 2023 building outlines = red, county road centrelines = cyan,
Adams centreline names printed) drawn through a transform (sheet a: chain of record + shift (dx,dy) px; loc94: tmp/troopmaps/j1/pred_loc94.json) so the residual shift of the map's roads and buildings can be read by eye.
Vectors are public Adams County GIS data (tmp/b1863/modern/vec). Tick grid every 20 px labelled in px offset from the crop centre."""
import sys, os, json, cv2, numpy as np
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS'] = str(2**40)
from pyproj import Transformer
from common_tm import *
sheet = sys.argv[1]; cx, cy, half = map(int, sys.argv[2:5]); Z = float(sys.argv[5]); dx, dy = float(sys.argv[6]), float(sys.argv[7]); out = sys.argv[8]
VEC = os.path.join(ROOT, 'tmp/b1863/modern/vec'); tf = Transformer.from_crs('EPSG:4326', 'EPSG:32618', always_xy=True)
if sheet == 'af':
    import fieldmodel_a as FM
    im = cv2.imread(os.path.join(TMP, 'full_a.png')); f = lambda en: np.array([FM.en_to_scan(*e) for e in np.atleast_2d(en)]) + [dx, dy]
elif sheet == 'a':
    S = SheetTransform('a'); im = cv2.imread(os.path.join(TMP, 'full_a.png')); f = lambda en: S.en_to_scan(np.atleast_2d(en)) + [dx, dy]
else:
    im = cv2.imread(os.path.join(ROOT, 'tmp/library/troopmaps/commons_LOC99447494_july1_2to330pm.jpg'))
    P = json.load(open(os.path.join(TMP, 'j1', 'pred_loc94.json'))); A = np.array(P['A']); c0 = np.array(P['c']); en0 = np.array(P['en0'])
    f = lambda en: (A @ (np.atleast_2d(en) - en0).T).T + c0 + [dx, dy]
x0, y0 = cx - half, cy - half
crop = im[max(0, y0):cy + half, max(0, x0):cx + half].copy()
c = cv2.resize(crop, None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC)
def toimg(p): return ((p[:, 0] - max(0, x0)) * Z).astype(np.int32), ((p[:, 1] - max(0, y0)) * Z).astype(np.int32)
cache = os.path.join(TMP, 'j1', 'vec_en.json')
if not os.path.exists(cache):
    B = json.load(open(os.path.join(VEC, 'adams_buildings2023.json')))['features']; R = json.load(open(os.path.join(VEC, 'adams_centerline.json')))['features']
    bl = []; rl = []
    for b in B:
        g = b['geometry']; rings = g['coordinates'] if g['type'] == 'Polygon' else [r for poly in g['coordinates'] for r in poly]
        r = np.array(rings[0]); e, n = tf.transform(r[:, 0], r[:, 1])
        if 305500 < np.mean(e) < 311500 and 4409000 < np.mean(n) < 4414500: bl.append(np.c_[e, n].round(1).tolist())
    for r in R:
        g = r['geometry']; lines = [g['coordinates']] if g['type'] == 'LineString' else g['coordinates']
        for l in lines:
            l = np.array(l); e, n = tf.transform(l[:, 0], l[:, 1])
            if e.max() > 303000 and e.min() < 312500 and n.max() > 4408000 and n.min() < 4415500: rl.append(dict(name=r['properties'].get('LSt_Name'), xy=np.c_[e, n].round(1).tolist()))
    json.dump(dict(b=bl, r=rl), open(cache, 'w'))
V = json.load(open(cache))
for r in V['r']:
    p = f(np.array(r['xy'])); u, v = toimg(p)
    if u.max() < 0 or v.max() < 0 or u.min() > c.shape[1] or v.min() > c.shape[0]: continue
    cv2.polylines(c, [np.c_[u, v]], False, (255, 255, 0), 1)
    k = len(u) // 2; cv2.putText(c, str(r['name'])[:16], (int(u[k]) + 3, int(v[k]) - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 120, 0), 1)
for b in V['b']:
    p = f(np.array(b)); u, v = toimg(p)
    if u.max() < 0 or v.max() < 0 or u.min() > c.shape[1] or v.min() > c.shape[0]: continue
    cv2.polylines(c, [np.c_[u, v]], True, (0, 0, 255), 1)
n = c.shape[0]
for o in range(-half + 20, half, 20):
    v = int((o + half) * Z)
    cv2.line(c, (v, 0), (v, 10), (255, 0, 255), 1); cv2.line(c, (0, v), (10, v), (255, 0, 255), 1)
    cv2.putText(c, str(cx + o), (v + 2, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 255), 1); cv2.putText(c, str(cy + o), (12, v + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 255), 1)
cv2.imwrite(out, c, [cv2.IMWRITE_JPEG_QUALITY, 85]); print(out, c.shape)
