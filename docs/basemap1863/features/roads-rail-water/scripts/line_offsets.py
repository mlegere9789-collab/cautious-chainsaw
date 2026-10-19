"""Generic lateral-offset profile between a registered line and drawn ink on sheet a: for each 25 m sample, the position (px, normal) of the strongest dark-ink peak within +-W px;
reports histogram, median, MAD, and fraction of samples with a clear peak. Used for rail (RL-002) and streams."""
import sys, os, json, math
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from icp import ink_map, MAPS, map_coordinates
from common import *
import regtf
from shapely.geometry import shape
def run(geoms, W=20, step_m=25.0, sig=1.2, thr=20):
    af = regtf.FieldTF(); ink = ink_map('a'); inkb = cv2.GaussianBlur(ink, (0, 0), sig)
    offs = []; n = 0
    for g in geoms:
        lines = [g] if g.geom_type == 'LineString' else list(g.geoms)
        for ln in lines:
            xy = [ll2m(*c[:2]) for c in ln.coords]
            acc = 0; nxt = 0
            for i in range(len(xy) - 1):
                (x1, y1), (x2, y2) = xy[i], xy[i + 1]; L = math.hypot(x2 - x1, y2 - y1)
                if L < 1e-6: continue
                tx, ty = (x2 - x1) / L, (y2 - y1) / L
                while nxt <= acc + L:
                    t = (nxt - acc) / L; E = x1 + (x2 - x1) * t; N = y1 + (y2 - y1) * t; nxt += step_m
                    p = np.array(af.en2px(E, N))
                    if not (60 < p[0] < 4090 and 400 < p[1] < 5300): continue
                    tp = af.jac_tangent(E, N, tx, ty); nr = np.array([-tp[1], tp[0]]); ss = np.arange(-W, W + 1, 1.0)
                    prof = np.zeros_like(ss)
                    for tau in (-6, -3, 0, 3, 6):
                        prof += map_coordinates(inkb, [p[1] + tau * tp[1] + ss * nr[1], p[0] + tau * tp[0] + ss * nr[0]], order=1, mode='constant', cval=0)
                    prof /= 5; n += 1
                    k = int(np.argmax(prof))
                    if prof[k] > thr and 0 < k < len(ss) - 1: offs.append(ss[k])
                acc += L
    return n, np.array(offs)
if __name__ == '__main__':
    which = sys.argv[1]
    if which == 'rail':
        feats = json.load(open(os.path.join(OUT, 'railways.geojson')))['features']
        for fid in ('RL-001', 'RL-002'):
            g = [shape(f['geometry']) for f in feats if f['id'] == fid]
            n, o = run(g, W=24)
            print(fid, 'samples', n, 'with peak', len(o), 'median px', float(np.median(o)) if len(o) else None, 'MAD', float(np.median(np.abs(o - np.median(o)))) if len(o) else None, 'hist', np.histogram(o, bins=[-24, -16, -8, -4, 4, 8, 16, 24])[0].tolist())
