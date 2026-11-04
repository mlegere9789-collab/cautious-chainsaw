"""Stage 3: choose which linked chains are contours.
Rules (all geometric; no elevation, no DEM):
  * length >= 40 px (after gap linking)
  * not a long straight run: >50 percent of the chain inside windows of 160 px that stay within 2.5 px of their chord
    (roads, straight fences, neatline) -- straightness measured after a 3-sample moving average (kills worm-fence zigzag)
  * where two chains' drawn lines overlap (a contour meeting a fence/road or a mis-link) the clearly more fence-like one
    (lower 'contourness': less turning per length, more linked gaps, shorter) is removed; two similar curvy chains are both kept
Writes tmp/bt/elev1863/contours_sel.pkl and stage3_stats.json
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s3_select.py
"""
import os
import sys
import pickle
import json
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import elev1863_vec as V

ch = pickle.load(open(os.path.join(C.CACHE, 'chains.pkl'), 'rb'))
pairs = pickle.load(open(os.path.join(C.CACHE, 'chain_overlaps.pkl'), 'rb'))
n = len(ch)
length = np.array([len(c['pts']) for c in ch], float)
gapfrac = np.array([c['gap'] / max(1.0, len(c['pts'])) for c in ch])
straight_frac = np.zeros(n)
turn100 = np.zeros(n)
for i, c in enumerate(ch):
    if length[i] < 40:
        continue
    r, t, fl = V.straight_mask(c['pts'], win=160, tol=2.5, smooth=3)
    straight_frac[i] = fl.mean() if len(fl) else 0
    rs, ts = V.resample(c['pts'], 4.0)
    if len(rs) > 8:
        k = 3
        ker = np.ones(2 * k + 1) / (2 * k + 1)
        rp = np.pad(rs, ((k, k), (0, 0)), mode='edge')
        sm = np.stack([np.convolve(rp[:, 0], ker, 'valid'), np.convolve(rp[:, 1], ker, 'valid')], 1)
        d = np.diff(sm, axis=0)
        ang = np.unwrap(np.arctan2(d[:, 1], d[:, 0]))
        turn100[i] = np.abs(np.diff(ang)).sum() / max(1.0, ts[-1]) * 100.0
contourness = turn100 - 3.0 * gapfrac + 0.002 * length
# straight chains (roads, straight fences, neatline) are rejected UNLESS they have >= 2 parallel neighbours: on steep slopes true
# contours are straight for hundreds of metres but always come as a parallel ladder; a road or fence does not.
import elev1863_s4_adj as ADJ
big = np.where(length >= 40)[0]
edges_all = ADJ.build_adjacency([ch[i]['pts'] for i in big], verbose=False)


def direction(p):
    q = p - p.mean(0)
    u, s_, vt = np.linalg.svd(q[:: max(1, len(q) // 200)], full_matrices=False)
    return vt[0]


dirs = {int(i): direction(ch[i]['pts']) for i in big}
npar = np.zeros(n, int)
for a, b, na, nb, dm in edges_all:
    ia, ib = int(big[a]), int(big[b])
    if length[ia] >= 60 and length[ib] >= 60 and abs(dirs[ia] @ dirs[ib]) >= np.cos(np.radians(12)):
        npar[ia] += 1
        npar[ib] += 1
rescued = (length >= 40) & (straight_frac > 0.5) & (npar >= 2)
alive = (length >= 40) & ((straight_frac <= 0.5) | rescued)
st = {'chains': n, 'len>=40': int((length >= 40).sum()), 'straight_rejected': int(((length >= 40) & (straight_frac > 0.5) & ~rescued).sum()),
      'straight_rescued_by_parallel_ladder': int(rescued.sum())}
killed_cross = 0
for (a, b), npx in sorted(pairs.items(), key=lambda kv: -kv[1]):
    if npx < 2:
        continue
    if not (alive[a] and alive[b]):
        continue
    loser, winner = (a, b) if contourness[a] < contourness[b] else (b, a)
    # only a clearly more fence-like (straighter / gappier / shorter) chain is removed; two curvy chains that meet are kept
    if length[loser] < 80 or contourness[loser] < contourness[winner] - 1.5:
        alive[loser] = False
        killed_cross += 1
st['crossing_rejected'] = killed_cross
st['kept'] = int(alive.sum())
st['kept_total_len_px'] = float(length[alive].sum())
out = []
for i in np.where(alive)[0]:
    out.append({'id': int(i), 'pts': ch[i]['pts'], 'gap': ch[i]['gap'], 'nlinks': ch[i]['nlinks'], 'turn100': float(turn100[i]),
                'straight_frac': float(straight_frac[i])})
pickle.dump(out, open(os.path.join(C.CACHE, 'contours_sel.pkl'), 'wb'))
json.dump(st, open(os.path.join(C.CACHE, 'stage3_stats.json'), 'w'), indent=1)
print(st)
