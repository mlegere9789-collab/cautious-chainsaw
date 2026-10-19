"""Pass 7: does the Bachelder/Warren sheet draw a fence or wall along each OSM-mapped fence/wall candidate?
For a candidate way, samples every 6 m (map px 3); for every lateral shift s in -16..16 px the fraction of samples with ink within 1.5 px of the shifted line is computed (ink = dark line pixel, 'ink_map' of icp);
the best constant shift is taken (registration residual), continuity = fraction at the best shift. Control: the same continuity for shifts of +-(40..64) px (80-128 m) from the best shift, mean of the best two.
Confirmed when continuity >= 0.80 and continuity - control >= 0.30 and the way is >= 40 m. Contours are smooth and long, so they can produce false confirmations on steep ground: ways whose best-shift profile has a second peak
of nearly equal height within 6 px (a parallel contour or double-line road edge) are flagged 'ambiguous'."""
import sys, os, json, math
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from icp import ink_map, map_coordinates
from common import *
import regtf
from shapely.geometry import shape
def run():
    af = regtf.FieldTF(); ink = ink_map('a'); inkd = cv2.dilate((ink > 20).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)
    fences = json.load(open(os.path.join(OUT, 'fences.geojson')))['features']
    res = {}
    for f in fences:
        g = shape(f['geometry']); L = f['properties'].get('length_m', 0)
        if L < 40: res[f['id']] = dict(verdict='too short'); continue
        xy = [ll2m(*c[:2]) for c in g.coords]; pts = []; tans = []
        acc = 0; nxt = 0
        for i in range(len(xy) - 1):
            (x1, y1), (x2, y2) = xy[i], xy[i + 1]; l = math.hypot(x2 - x1, y2 - y1)
            if l < 1e-6: continue
            tx, ty = (x2 - x1) / l, (y2 - y1) / l
            while nxt <= acc + l:
                t = (nxt - acc) / l; pts.append((x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)); tans.append((tx, ty)); nxt += 6.0
            acc += l
        P = np.array([af.en2px(E, N) for E, N in pts])
        if not ((P[:, 0] > 60).all() and (P[:, 0] < 4090).all() and (P[:, 1] > 420).all() and (P[:, 1] < 5300).all()): res[f['id']] = dict(verdict='off sheet'); continue
        T = np.array([af.jac_tangent(E, N, tx, ty) for (E, N), (tx, ty) in zip(pts, tans)]); NR = np.stack([-T[:, 1], T[:, 0]], 1)
        shifts = np.arange(-70, 71, 1.0); cont = []
        for s in shifts:
            Q = P + s * NR
            v = map_coordinates(inkd, [Q[:, 1], Q[:, 0]], order=0, mode='constant', cval=0)
            cont.append(v.mean())
        cont = np.array(cont)
        win = (shifts >= -16) & (shifts <= 16); k = int(np.argmax(np.where(win, cont, -1))); best = cont[k]; s0 = shifts[k]
        far = np.abs(shifts - s0) >= 40; control = float(np.sort(cont[far])[-2:].mean()) if far.any() else float('nan')
        near = (np.abs(shifts - s0) >= 3) & (np.abs(shifts - s0) <= 8); second = float(cont[near].max()) if near.any() else 0.0
        ok = best >= 0.80 and (best - control) >= 0.30 and L >= 40
        res[f['id']] = dict(verdict=('confirmed' if ok else 'not confirmed'), continuity=round(float(best), 2), shift_px=float(s0), control=round(control, 2), second_peak=round(second, 2), ambiguous=bool(ok and second > best - 0.1), length_m=L)
    return res
if __name__ == '__main__':
    r = run()
    import collections
    print(collections.Counter(v['verdict'] for v in r.values()), 'ambiguous', sum(1 for v in r.values() if v.get('ambiguous')))
    json.dump(dict(method=__doc__, registration='regtf.FieldTF', results=r), open(os.path.join(OUT, 'verification', 'pass7_fences.json'), 'w'), indent=1)
