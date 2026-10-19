"""Pass 5: does the Bachelder sheet draw a road where the catalogued road is?  For every sample (40 m) along each catalogued road feature:
 detection = a pair of parallel dark lines (road edges, 4-12 px apart) found within +-WIN px of the registered position, with each line present along >= 70 percent of 18 px of tangent.
 Control = the same detector on the same samples displaced 90-140 px (180-280 m) sideways, both sides, averaged.
 Reports per road: detection rate, control rate, and the median normal offset of detections (px, m).  Registration used: tf_peer15 (global affine from 25 GCPs, LOO median ~20 m)."""
import sys, os, json, math
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from icp import *
from shapely.geometry import shape
WIN = 16
def ink():
    g = cv2.imread(os.path.join(MAPS, 'bach1879_a.50.jpg'), cv2.IMREAD_GRAYSCALE).astype(np.float32)
    bg = cv2.GaussianBlur(g, (0, 0), 25); k = ((bg - g) > 35).astype(np.float32)
    return k
INK = None
def detect(af, E, N, tx, ty, shift=0.0, win=WIN):
    """returns (found, offset_px)"""
    global INK
    p = np.array(af.en2px(E, N)); tp = af.jac_tangent(E, N, tx, ty); nrm = np.array([-tp[1], tp[0]])
    taus = np.arange(-9, 10, 1.5); ss = np.arange(-win - 8, win + 9, 1.0)
    X = p[0] + shift * nrm[0] + taus[:, None] * tp[0] + ss[None, :] * nrm[0]; Y = p[1] + shift * nrm[1] + taus[:, None] * tp[1] + ss[None, :] * nrm[1]
    v = map_coordinates(INK, [Y.ravel(), X.ravel()], order=1, mode='constant', cval=0).reshape(X.shape)
    prof = (v > 0.4).mean(axis=0)               # fraction of tangent samples inked at each lateral offset
    best = None
    for i, s in enumerate(ss):
        if abs(s) > win: continue
        for w in (5, 6, 7, 8, 10, 12):
            a = np.interp(s - w / 2, ss, prof); b = np.interp(s + w / 2, ss, prof); mid = np.interp(s, ss, prof)
            sc = min(a, b) - 0.5 * mid
            if sc > 0.55 and (best is None or sc > best[0]): best = (sc, s)
    return (best is not None), (best[1] if best else None)
if __name__ == '__main__':
    INK = ink()
    import regtf
    af = regtf.FieldTF()
    roads = json.load(open(os.path.join(OUT, 'roads.geojson')))['features']
    out = {}
    for f in roads:
        g = shape(f['geometry']); lines = [g] if g.geom_type == 'LineString' else list(g.geoms)
        n = 0; det = 0; ctl = 0; offs = []; inpx = 0
        for ln in lines:
            xy = [ll2m(*c[:2]) for c in ln.coords]
            acc = 0; nxt = 0
            for i in range(len(xy) - 1):
                (x1, y1), (x2, y2) = xy[i], xy[i + 1]; L = math.hypot(x2 - x1, y2 - y1)
                if L < 1e-6: continue
                tx, ty = (x2 - x1) / L, (y2 - y1) / L
                while nxt <= acc + L:
                    t = (nxt - acc) / L; E = x1 + (x2 - x1) * t; N = y1 + (y2 - y1) * t
                    nxt += 40.0
                    px, py = af.en2px(E, N)
                    if not (60 < px < 4090 and 400 < py < 5300): continue
                    n += 1
                    ok, o = detect(af, E, N, tx, ty)
                    if ok: det += 1; offs.append(o)
                    c = 0
                    for sh in (-140, -110, 110, 140):
                        c += detect(af, E, N, tx, ty, shift=sh)[0]
                    ctl += c / 4.0
                acc += L
        if n:
            out[f['id']] = dict(name=f['properties']['name'][:50], samples=n, detection_rate=round(det / n, 3), control_rate=round(ctl / n, 3), median_offset_px=(round(float(np.median(offs)), 1) if offs else None),
                                median_offset_m=(round(float(np.median(offs)) * 2.0, 1) if offs else None), p90_abs_offset_m=(round(float(np.percentile(np.abs(offs), 90)) * 2.0, 1) if offs else None))
        else: out[f['id']] = dict(name=f['properties']['name'][:50], samples=0)
        print(f['id'], out[f['id']])
    os.makedirs(os.path.join(OUT, 'verification'), exist_ok=True)
    json.dump(dict(registration='b-maps affine + displacement field (regtf.FieldTF)', window_px=WIN, spacing_m=40, results=out), open(os.path.join(OUT, 'verification', 'pass5_map_presence.json'), 'w'), indent=1)
