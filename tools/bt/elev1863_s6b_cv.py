"""Cross-validation of the level solve against the PRINTED LABELS (Warren-only truth, independent of the modern DEM).
Hold out a fold of anchors, solve with the rest, predict the held-out fragments' levels, compare with the label.
Reports the error as a function of graph-hop distance from the nearest TRAINING anchor.
Writes docs/battle-theatre/terrain/elev1863/cv_label_holdout.json
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s6b_cv.py
"""
import os
import sys
import json
import pickle
import collections
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import elev1863_s6_solve as S6
import elev1863_s5_levels as S5

frags, edges, D, anchors = S6.prepare()
n = len(frags)
A = [a for a in anchors if a.get('frag') is not None]
adj = [[] for _ in range(n)]
for a, b, na, nb, dm in edges:
    adj[a].append(b)
    adj[b].append(a)
rng = np.random.RandomState(7)
order = rng.permutation(len(A))
K = 8
folds = [order[i::K] for i in range(K)]
z_all, _, _ = S6.solve(n, edges, D, A, iters=5)
rows = []
for k, fold in enumerate(folds):
    hold = set(int(i) for i in fold)
    train = [a for i, a in enumerate(A) if i not in hold]
    z, _, _ = S6.solve(n, edges, D, train, iters=4, x0=z_all)
    # hop distance from nearest training anchor (multi-source BFS)
    dist = np.full(n, -1)
    q = collections.deque()
    for a in train:
        if dist[a['frag']] < 0:
            dist[a['frag']] = 0
            q.append(a['frag'])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if dist[v] < 0:
                dist[v] = dist[u] + 1
                q.append(v)
    for i in hold:
        a = A[i]
        rows.append({'id': a['id'], 'label_ft': a['level_ft'], 'pred_ft': float(z[a['frag']]), 'err_ft': float(z[a['frag']] - a['level_ft']),
                     'hops_to_nearest_training_anchor': int(dist[a['frag']]), 'ambiguous': bool(a.get('ambiguous', False)), 'kind': a['kind']})
    print('fold', k, 'done', flush=True)
err = np.array([r['err_ft'] for r in rows])
hop = np.array([r['hops_to_nearest_training_anchor'] for r in rows])
summ = {}
for lo, hi in [(0, 2), (3, 5), (6, 9), (10, 14), (15, 99)]:
    m = (hop >= lo) & (hop <= hi)
    if m.sum():
        e = err[m]
        summ['%d-%d' % (lo, hi)] = {'n': int(m.sum()), 'median_abs_err_ft': float(np.median(np.abs(e))), 'p90_abs_err_ft': float(np.percentile(np.abs(e), 90)),
                                    'share_within_4ft': float((np.abs(e) <= 4).mean()), 'share_within_8ft': float((np.abs(e) <= 8).mean())}
out = {'method': 'k-fold (8) hold-out of printed-label anchors; prediction = robust LS level of the anchored fragment',
       'n_anchors': len(A), 'summary_by_hops_to_nearest_training_anchor': summ, 'rows': rows}
json.dump(out, open(os.path.join(C.OUT, 'cv_label_holdout.json'), 'w'), indent=1)
print(json.dumps(summ, indent=1))
