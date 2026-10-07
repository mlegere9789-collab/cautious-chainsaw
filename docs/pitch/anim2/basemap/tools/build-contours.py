"""Contours from the 3DEP DEM (z15 grid, 1.83 m): marching squares, chained, simplified.  Output: tmp/look-dev/basemap/build/contours.json
{ 'minor': [[ [mx,my], ... ], ...], 'major': [...] } in Web Mercator metres, plus statistics.  Interval 10 ft (3.048 m); index (major) every 50 ft.
Usage: python build-contours.py [--sigma 2.0] [--eps 2.2] [--out file]   (sigma: gaussian smoothing of the DEM in px of the 1.83 m grid, so contour noise around small bumps is gone; eps: Douglas-Peucker tolerance in ground metres)"""
import json, math, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from terrain import smooth
from dem import DemMosaic
import numpy as np

arg = lambda n, d: type(d)(sys.argv[sys.argv.index(n) + 1]) if n in sys.argv else d
SIGMA, EPS = arg('--sigma', 2.0), arg('--eps', 2.2)           # the values the shipped data/vectors.mjs was built with (found 2026-10-07 by matching its lines: every one of its 2,537 contour lines is reproduced exactly)
OUTFILE = arg('--out', '')                                                    # default: tmp/look-dev/basemap/build/contours.json
BUILD = os.path.join(ROOT, 'tmp', 'look-dev', 'basemap', 'build')
FT = 0.3048
STEP = 10 * FT
PX = mpp(15)                                                       # merc metres per pixel of the z15 grid


def segments(a, h):
    """marching squares for level h on array a: returns list of ((ea, eb), (pa, pb)) with edge ids and points in pixel coordinates"""
    tl, tr, br, bl = a[:-1, :-1] >= h, a[:-1, 1:] >= h, a[1:, 1:] >= h, a[1:, :-1] >= h
    idx = tl * 8 + tr * 4 + br * 2 + bl
    ii, jj = np.nonzero((idx > 0) & (idx < 15))
    if len(ii) == 0:
        return []
    out = []
    A, B, C, D = a[ii, jj], a[ii, jj + 1], a[ii + 1, jj + 1], a[ii + 1, jj]                   # tl tr br bl heights
    ci = idx[ii, jj]

    def t(p, q):
        d = q - p
        d = np.where(np.abs(d) < 1e-9, 1e-9, d)
        return np.clip((h - p) / d, 0, 1)
    tt, rt, bt, lt = t(A, B), t(B, C), t(D, C), t(A, D)          # crossing fractions on top, right, bottom, left edges
    # edge ids: ('H', i, j) horizontal edge between (i,j)-(i,j+1); ('V', i, j) vertical edge between (i,j)-(i+1,j)
    top = lambda k: (0, ii[k], jj[k], jj[k] + tt[k], ii[k])
    right = lambda k: (1, ii[k], jj[k] + 1, jj[k] + 1.0, ii[k] + rt[k])
    bottom = lambda k: (0, ii[k] + 1, jj[k], jj[k] + bt[k], ii[k] + 1.0)
    left = lambda k: (1, ii[k], jj[k], jj[k] + 0.0, ii[k] + lt[k])
    table = {1: [(left, bottom)], 2: [(bottom, right)], 3: [(left, right)], 4: [(top, right)], 6: [(top, bottom)], 7: [(left, top)], 8: [(left, top)], 9: [(top, bottom)],
             11: [(top, right)], 12: [(left, right)], 13: [(bottom, right)], 14: [(left, bottom)]}
    for k in range(len(ii)):
        c = int(ci[k])
        if c in (5, 10):                                           # saddle: decide by the cell centre
            centre = (A[k] + B[k] + C[k] + D[k]) / 4 >= h
            if c == 5:
                pairs = [(left, top), (bottom, right)] if not centre else [(left, bottom), (top, right)]
            else:
                pairs = [(left, bottom), (top, right)] if not centre else [(left, top), (bottom, right)]
        else:
            pairs = table[c]
        for fa, fb in pairs:
            pa, pb = fa(k), fb(k)
            out.append(((pa[0], int(pa[1]), int(pa[2])), (pb[0], int(pb[1]), int(pb[2])), (pa[3], pa[4]), (pb[3], pb[4])))
    return out


def chain(segs):
    """join segments sharing an edge id into polylines of pixel points"""
    adj = {}
    for s, (ea, eb, pa, pb) in enumerate(segs):
        adj.setdefault(ea, []).append(s)
        adj.setdefault(eb, []).append(s)
    used = [False] * len(segs)
    lines = []
    for s0 in range(len(segs)):
        if used[s0]:
            continue
        used[s0] = True
        ea, eb, pa, pb = segs[s0]
        pts = [pa, pb]
        ends = [ea, eb]
        for side in (1, 0):                                           # grow at the end, then at the start
            while True:
                e = ends[1] if side == 1 else ends[0]
                nxt = next((s for s in adj.get(e, ()) if not used[s]), None)
                if nxt is None:
                    break
                used[nxt] = True
                na, nb, qa, qb = segs[nxt]
                if na == e:
                    pt, ne = qb, nb
                else:
                    pt, ne = qa, na
                if side == 1:
                    pts.append(pt)
                    ends[1] = ne
                else:
                    pts.insert(0, pt)
                    ends[0] = ne
        lines.append(pts)
    return lines


def rdp(p, eps):
    """Douglas-Peucker on an (n,2) array, iterative"""
    n = len(p)
    if n < 3:
        return p
    keep = np.zeros(n, bool)
    keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        seg = p[b] - p[a]
        L = math.hypot(seg[0], seg[1])
        q = p[a + 1:b] - p[a]
        d = np.abs(q[:, 0] * seg[1] - q[:, 1] * seg[0]) / L if L > 1e-9 else np.hypot(q[:, 0], q[:, 1])
        k = int(np.argmax(d))
        if d[k] > eps:
            m = a + 1 + k
            keep[m] = True
            stack.append((a, m))
            stack.append((m, b))
    return p[keep]


if __name__ == '__main__':
    R = json.load(open(os.path.join(BASEMAP, 'plan.json')))['z14Range']
    m15 = DemMosaic(15, 14)
    HALO = 8
    out = {'minor': [], 'major': []}
    t0 = time.time()
    nseg = 0
    for by in range(R['y0'], R['y1'] + 1):
        for bx in range(R['x0'], R['x1'] + 1):
            dem = m15.window(bx * 1024 - HALO, by * 1024 - HALO, 1024 + 2 * HALO, 1024 + 2 * HALO)
            if np.isnan(dem).all():
                continue
            d = smooth(dem, SIGMA)
            lo, hi = float(d.min()), float(d.max())
            for k in range(int(math.floor(lo / STEP)), int(math.ceil(hi / STEP)) + 1):
                h = k * STEP + 1e-3
                feet = round(k * 10)
                segs = [s for s in segments(d, h)]
                # keep the cells that belong to this block (not the halo) so each segment is produced once
                segs = [s for s in segs if HALO <= s[2][0] < HALO + 1024 and HALO <= s[2][1] < HALO + 1024]
                if not segs:
                    continue
                nseg += len(segs)
                for pts in chain(segs):
                    p = np.array(pts, np.float64)
                    if len(p) < 3:
                        continue
                    p = rdp(p, EPS / PX / math.cos(math.radians(39.81)) * 1.0)              # EPS ground metres -> pixels (ground = merc * cos(lat))
                    # pixel -> global pixel -> merc metres
                    gx = (bx * 1024 - HALO + p[:, 0] + 0.5) * PX - ORIGIN
                    gy = ORIGIN - (by * 1024 - HALO + p[:, 1] + 0.5) * PX
                    out['major' if feet % 50 == 0 else 'minor'].append([[round(float(x), 2), round(float(y), 2)] for x, y in zip(gx, gy)])
        print(f'block row {by} col {bx}  lines minor {len(out["minor"])} major {len(out["major"])}  {time.time() - t0:.0f}s', flush=True)
    stats = {k: {'lines': len(v), 'vertices': sum(len(l) for l in v)} for k, v in out.items()}
    print(stats, 'segments', nseg)
    json.dump({'stats': stats, 'sigma': SIGMA, 'eps': EPS, **out}, open(OUTFILE or os.path.join(BUILD, 'contours.json'), 'w'))
