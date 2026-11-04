"""Stage 4: adjacency graph of contour fragments by perpendicular ray casting.
A ray from a sample on fragment f along its left/right normal that reaches fragment g first (no other fragment between)
makes f and g ADJACENT (they bound one 4-ft band, or a crest/valley band: level difference 0 or 4 ft).
Writes tmp/bt/elev1863/adj.pkl : dict(edges=[(f, g, n_fg, n_gf, median_dist_px)], frag=list of fragment pts)
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s4_adj.py
"""
import os
import sys
import pickle
import time
import numpy as np
import cv2
from numba import njit
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import elev1863_vec as V

RMAX = 140
STEP = 6


@njit(cache=True)
def cast(idimg, ox, oy, nx, ny, own, rmax):
    h, w = idimg.shape
    for t in range(3, rmax):
        x = int(round(ox + nx * t))
        y = int(round(oy + ny * t))
        if x < 0 or y < 0 or x >= w or y >= h:
            return 0, t
        v = idimg[y, x]
        if v != 0 and v != own:
            return v, t
        if v == own and t > 12:
            # re-hit own curve (curls back): stop, no neighbour that way
            return 0, t
    return 0, rmax


def build_adjacency(pts_list, verbose=True):
    t0 = time.time()
    n = len(pts_list)
    assert n < 65000
    cs = [{'pts': p} for p in pts_list]
    idimg = np.zeros((C.H, C.W), np.uint16)
    for i, c in enumerate(cs):
        cv2.polylines(idimg, [np.round(c['pts']).astype(np.int32).reshape(-1, 1, 2)], False, i + 1, 2)
    print('raster', round(time.time() - t0), flush=True)
    hits = {}
    dist = {}
    for i, c in enumerate(cs):
        r, t = V.resample(c['pts'], float(STEP))
        if len(r) < 4:
            continue
        k = 2
        d = np.zeros_like(r)
        d[k:-k] = r[2 * k:] - r[:-2 * k]
        d[:k] = d[k]
        d[-k:] = d[-k - 1]
        L = np.hypot(d[:, 0], d[:, 1]) + 1e-9
        nrm = np.stack([-d[:, 1], d[:, 0]], 1) / L[:, None]
        for s in range(len(r)):
            for side in (1.0, -1.0):
                g, dd = cast(idimg, float(r[s, 0]), float(r[s, 1]), float(nrm[s, 0] * side), float(nrm[s, 1] * side), i + 1, RMAX)
                if g:
                    key = (i, g - 1)
                    hits[key] = hits.get(key, 0) + 1
                    dist.setdefault(key, []).append(dd)
    print('rays', round(time.time() - t0), len(hits), flush=True)
    edges = []
    done = set()
    for (a, b), nab in hits.items():
        if (a, b) in done:
            continue
        nba = hits.get((b, a), 0)
        done.add((a, b))
        done.add((b, a))
        if nab + nba >= 3 and min(nab, nba) >= 1:
            dm = float(np.median(dist[(a, b)] + dist.get((b, a), [])))
            edges.append((a, b, nab, nba, dm))
    print('edges', len(edges), round(time.time() - t0), flush=True)
    return edges


def main():
    cs = pickle.load(open(os.path.join(C.CACHE, 'contours_sel.pkl'), 'rb'))
    edges = build_adjacency([c['pts'] for c in cs])
    pickle.dump({'edges': edges, 'n': len(cs)}, open(os.path.join(C.CACHE, 'adj.pkl'), 'wb'))


if __name__ == '__main__':
    main()
