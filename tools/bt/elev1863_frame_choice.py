"""Task 1 (part 2): choose between the affine and FFD Warren frames ONLY by evidence, and say what the evidence is.

Evidence used (all level-free, so it does not depend on contour labels, on the datum or on any elevation assignment):
  E1  control points (frames_reconcile.json): affine leave-one-out 16.5 m; FFD (never fitted to them) 26.4 m rms on the same 23 points.
  E2  road-line points (6): affine 13.9 m, FFD 19.6 m.  b1863 check 2 (45 road runs): affine 17.1, FFD 11.1 (FFD was fitted to roads).
  E3  contour-versus-surface coherence: a contour is a level line, so the modern DEM sampled along it should be nearly constant.
      The along-contour standard deviation (m) of the DEM, summed over every extracted contour fragment >= 60 px, is a measure of how
      well each frame lays Warren's lines on the ground that is still there.  It needs no elevation assignment.
  E4  the best regional translation (+-48 m) of each frame, found by minimising the same variance per 2000 px cell, says how far
      each frame still is from the ground (diagnostic only; NOT applied to any product).
Writes into frames_reconcile.json: 'coherence', 'decision'; and frames_coherence_map.png
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_frame_choice.py
"""
import os
import sys
import json
import numpy as np
from scipy.ndimage import map_coordinates
import rasterio
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

P = np.load(os.path.join(C.CACHE, 'points.npz'))
frag = P['frag']
dem = rasterio.open(C.DEM).read(1)
# fragment lengths in samples
cnt = np.bincount(frag)
ok = cnt[frag] >= 15          # >= 60 px of line at 4 px spacing


def fragvar(E, N, dx=0.0, dy=0.0):
    v = map_coordinates(dem, [C.DEM_Y0 - (N + dy) - 0.5, (E + dx) - C.DEM_X0 - 0.5], order=1, mode='nearest')
    s = np.bincount(frag, v)
    s2 = np.bincount(frag, v * v)
    m = s / np.maximum(cnt, 1)
    var = s2 / np.maximum(cnt, 1) - m * m
    return var, m


res = {}
for k in ('affine', 'ffd'):
    var, m = fragvar(P['E_' + k], P['N_' + k])
    sel = cnt >= 15
    sd = np.sqrt(np.maximum(var[sel], 0))
    w = cnt[sel]
    res[k] = {'n_fragments': int(sel.sum()), 'median_along_contour_sd_m': float(np.median(sd)), 'length_weighted_mean_var_m2': float((var[sel] * w).sum() / w.sum()),
              'rms_along_contour_sd_m': float(np.sqrt((var[sel] * w).sum() / w.sum())), 'p90_sd_m': float(np.percentile(sd, 90))}
    res[k]['_var'] = var
va, vf = res['affine'].pop('_var'), res['ffd'].pop('_var')
sel = cnt >= 15
better_aff = float(((va < vf) & sel).sum() / sel.sum())
res['share_of_fragments_where_affine_has_lower_variance'] = better_aff

# regional best shifts
cell = 2000
cx = (np.arange(C.W) // cell)
shifts = np.arange(-48, 49, 6)
reg = {}
fig, ax = plt.subplots(1, 2, figsize=(14, 8))
for ai, k in enumerate(('affine', 'ffd')):
    E, N = P['E_' + k], P['N_' + k]
    ci = np.minimum((P['px'] // cell).astype(int), C.W // cell)
    cj = np.minimum((P['py'] // cell).astype(int), C.H // cell)
    cid = cj * 10 + ci
    best = {}
    for c in np.unique(cid):
        m = (cid == c) & ok
        if m.sum() < 800:
            continue
        sub = np.where(m)[0]
        fsub = frag[sub]
        # per-point variance contribution: within-fragment variance for this cell's pieces only
        uf, inv = np.unique(fsub, return_inverse=True)
        cn = np.bincount(inv)
        keep = cn >= 10
        z0 = None
        bestv = None
        v0 = None
        for dx in shifts:
            for dy in shifts:
                v = map_coordinates(dem, [C.DEM_Y0 - (N[sub] + dy) - 0.5, (E[sub] + dx) - C.DEM_X0 - 0.5], order=1, mode='nearest')
                s1 = np.bincount(inv, v)
                s2 = np.bincount(inv, v * v)
                mm = s1 / cn
                var = (s2 / cn - mm * mm)[keep]
                tot = float((var * cn[keep]).sum() / cn[keep].sum())
                if dx == 0 and dy == 0:
                    v0 = tot
                if bestv is None or tot < bestv[0]:
                    bestv = (tot, dx, dy)
        best[int(c)] = {'n_pts': int(m.sum()), 'var_at_zero_shift_m2': v0, 'best_var_m2': bestv[0], 'best_shift_E_m': int(bestv[1]), 'best_shift_N_m': int(bestv[2])}
    reg[k] = best
    xs = [(c % 10, c // 10, b['best_shift_E_m'], b['best_shift_N_m']) for c, b in best.items()]
    xs = np.array(xs)
    ax[ai].quiver(xs[:, 0], xs[:, 1], xs[:, 2], -xs[:, 3], angles='xy', scale_units='xy', scale=24)
    ax[ai].set_xlim(-0.5, 4.9)
    ax[ai].set_ylim(5.4, -0.5)
    ax[ai].set_title(k + ': best regional shift of the frame (arrow 24 m = 1 cell), E right N up')
    ax[ai].set_aspect('equal')
plt.tight_layout()
plt.savefig(os.path.join(C.OUT, 'frames_coherence_map.png'), dpi=70)
res['regional_best_shifts'] = reg
for k in ('affine', 'ffd'):
    b = reg[k]
    sh = np.array([np.hypot(v['best_shift_E_m'], v['best_shift_N_m']) for v in b.values()])
    red = np.array([1 - v['best_var_m2'] / v['var_at_zero_shift_m2'] for v in b.values()])
    res[k]['regional_best_shift_median_m'] = float(np.median(sh))
    res[k]['regional_best_shift_p90_m'] = float(np.percentile(sh, 90))
    res[k]['median_variance_reduction_by_best_shift'] = float(np.median(red))
    res[k]['n_cells'] = len(b)
fr = json.load(open(os.path.join(C.OUT, 'frames_reconcile.json')))
fr['coherence'] = res
json.dump(fr, open(os.path.join(C.OUT, 'frames_reconcile.json'), 'w'), indent=1)
print(json.dumps({k: res[k] for k in ('affine', 'ffd', 'share_of_fragments_where_affine_has_lower_variance')}, indent=1))
