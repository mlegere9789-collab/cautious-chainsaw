"""Stage 6: levels (relative feet above Warren's datum) for the contour fragments.

TIER A  (Warren-only, strict): fragments whose level is fixed exactly by printed labels plus the ladder of adjacent contours
        (lo == hi in stage 5).  No DEM input at all.
TIER B  (orientation from the regional modern DEM, magnitudes from Warren): a robust least-squares solve
            z_g - z_f = 4 ft * s_fg           for every pair of adjacent contour fragments (f, g)
            z_a      = printed label value     for the anchored fragments
        where s_fg = +1 / -1 says which of the two is uphill.  s_fg comes from the sign of the DIFFERENCE of the modern 3DEP surface
        smoothed at ~50 m, averaged along each fragment.  The DEM supplies only this binary uphill/downhill orientation (what a
        human reader gets from the shape of the hills); it never supplies a level, a magnitude or a datum.  Tier B is therefore
        labelled DEM-ORIENTED in every product, and Tier A is used to measure how reliable the orientation is.
Writes tmp/bt/elev1863/levels_B.pkl
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s6_solve.py
"""
import os
import sys
import json
import pickle
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spl
from scipy.ndimage import gaussian_filter, map_coordinates
import rasterio
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import elev1863_s5_levels as S5

SIGMA_M = 50.0
FLAT_M = 0.12          # |smoothed DEM difference| below this: orientation weak, edge down-weighted


def regional_dem():
    ds = rasterio.open(C.DEM)
    f = 10
    H = (ds.height // f) * f
    W = (ds.width // f) * f
    a = np.empty((H // f, W // f), np.float32)
    for r in range(0, H, 1000):
        blk = ds.read(1, window=((r, min(H, r + 1000)), (0, W))).astype(np.float32)
        blk = np.nan_to_num(blk, nan=np.nanmean(blk))
        a[r // f:(r + blk.shape[0]) // f] = blk.reshape(blk.shape[0] // f, f, W // f, f).mean((1, 3))
    return gaussian_filter(a, SIGMA_M / f, mode='nearest'), f


def prepare():
    frags = S5.load_fragments()
    n = len(frags)
    ad = pickle.load(open(os.path.join(C.CACHE, 'adj.pkl'), 'rb'))
    reg, f = regional_dem()
    px2utm = C.load_frame('affine')[0]
    D = np.zeros(n)
    for i, c in enumerate(frags):
        p = c['pts'][::4]
        E, N = px2utm(p[:, 0], p[:, 1])
        col = (E - C.DEM_X0) / f - 0.5
        row = (C.DEM_Y0 - N) / f - 0.5
        D[i] = map_coordinates(reg, [row, col], order=1, mode='nearest').mean()
    anchors = S5.associate(frags, S5.anchors_all())
    return frags, ad['edges'], D, anchors


def solve(n, edges, D, A, iters=6, x0=None, verbose=False):
    """Robust LS.  A: list of anchors (dict with frag, level_ft, ambiguous)."""
    rows = []
    for a, b, na, nb, dm in edges:
        d = D[b] - D[a]
        s = 1.0 if d >= 0 else -1.0
        w0 = np.log1p(na + nb)
        if abs(d) < FLAT_M:
            w0 *= 0.25
        rows.append((a, b, 4.0 * s, w0, 'e'))
    ne = len(rows)
    for a in A:
        rows.append((a['frag'], -1, float(a['level_ft']), 12.0 if not a.get('ambiguous') else 5.0, 'a'))
    m = len(rows)
    ia = np.array([r[0] for r in rows])
    ib = np.array([r[1] for r in rows])
    val = np.array([r[2] for r in rows])
    w0 = np.array([r[3] for r in rows])
    isE = np.array([r[4] == 'e' for r in rows])
    w = w0.copy()
    z = np.zeros(n) if x0 is None else x0.copy()
    for it in range(iters):
        r_idx = np.arange(m)
        ii = np.concatenate([r_idx[isE], r_idx[isE], r_idx[~isE]])
        jj = np.concatenate([ia[isE], ib[isE], ia[~isE]])
        vv = np.concatenate([-w[isE], w[isE], w[~isE]])
        M = sp.csr_matrix((vv, (ii, jj)), shape=(m, n))
        sol = spl.lsqr(M, w * val, damp=1e-3, atol=1e-8, btol=1e-8, iter_lim=3000, x0=z)
        z = sol[0]
        pred = np.where(isE, z[np.where(isE, ib, 0)] - z[ia], z[ia])
        res = (pred - val) / 4.0
        w = w0 * np.minimum(1.0, 1.5 / np.maximum(np.abs(res), 1e-6))
        if verbose:
            print('iter', it, 'edge resid >1 step: %.3f' % (np.abs(res[:ne]) > 1).mean(), flush=True)
    return z, res[:ne], res[ne:]


def main():
    frags, edges, D, anchors = prepare()
    n = len(frags)
    A = [a for a in anchors if a.get('frag') is not None]
    z, eres, ares = solve(n, edges, D, A, iters=6, verbose=True)
    anch_fit = [(a['id'], a['level_ft'], float(z[a['frag']]), a.get('ambiguous', False), a.get('dist_px')) for a in A]
    out = {'z_ft': z, 'D_reg': D, 'anchors': anch_fit, 'edge_res_steps': eres, 'anchor_assoc': anchors, 'sigma_m': SIGMA_M}
    pickle.dump(out, open(os.path.join(C.CACHE, 'levels_B.pkl'), 'wb'))
    r = np.array([abs(t[1] - t[2]) for t in anch_fit])
    print('anchors', len(anch_fit), 'median |fit-label| ft', np.median(r), 'p90', np.percentile(r, 90))
    for t in sorted(anch_fit, key=lambda t: -abs(t[1] - t[2]))[:15]:
        print('  worst', t)


if __name__ == '__main__':
    main()
