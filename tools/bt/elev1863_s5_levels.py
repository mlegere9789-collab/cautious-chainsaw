"""Stage 5: attach the READ printed labels (anchors) to contour fragments and propagate levels.

Method (Warren-only; the modern DEM is NOT used here):
  * every printed label gives the relative elevation (feet above Warren's datum, 500 ft below the cemetery) of the NEAREST
    CURVE (Warren legend).  Margin labels sit at the neatline where the labelled contour meets it; interior labels sit inside
    the innermost closed contour of a hilltop.
  * adjacent contour fragments (stage 4) differ by 0 or 4 ft, so a fragment at graph distance d from an anchor of level z has
    z - 4d <= level <= z + 4d (Lipschitz bounds).  Over all anchors: lo = max(z_a - 4 d_a), hi = min(z_a + 4 d_a).
  * a fragment gets an elevation only when lo == hi (the printed labels and the ladder of adjacent contours fix it exactly);
    anything else stays UNASSIGNED (never guessed).  lo > hi is a CONFLICT (label misread, wrong fragment, missed/extra curve).
Writes tmp/bt/elev1863/levels.pkl and anchors_assoc.json
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s5_levels.py
"""
import os
import sys
import json
import pickle
import collections
import numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C

FRAME = {'left': 417.0, 'right': 8477.0, 'top': 833.0, 'bottom': 9397.0}


def load_fragments():
    cs = pickle.load(open(os.path.join(C.CACHE, 'contours_sel.pkl'), 'rb'))
    return cs


def anchors_all():
    A = json.load(open(os.path.join(C.CACHE, 'margin_labels.json')))
    for a in A:
        a['level_ft'] = a['value_ft']
    I = json.load(open(os.path.join(C.OUT, 'interior_labels.json')))
    for a in I:
        a['kind'] = 'interior'
        a['level_ft'] = int(4 * np.floor(a['value_ft'] / 4.0))
    return A + I


def associate(frags, anchors):
    pts = []
    ids = []
    for i, c in enumerate(frags):
        p = c['pts']
        q = p[::2]
        pts.append(q)
        ids.append(np.full(len(q), i))
    P = np.concatenate(pts)
    I = np.concatenate(ids)
    tree = cKDTree(P)
    END_TABLE = []
    for fi, c in enumerate(frags):
        p = c['pts']
        if len(p) < 15:
            continue
        for e in (0, 1):
            pt = p[0] if e == 0 else p[-1]
            q = p[min(12, len(p) - 1)] if e == 0 else p[-1 - min(12, len(p) - 1)]
            v = pt - q
            L = np.hypot(*v)
            if L > 0:
                END_TABLE.append((fi, e, pt, v / L))
    out = []
    for a in anchors:
        x, y = a['x'], a['y']
        if a['kind'] == 'margin':
            side = a['side']
            # extrapolate every fragment END along its end tangent to the neatline; the label marks where its contour meets the line
            if side in ('top', 'bottom'):
                line = FRAME[side]
                along = x
            else:
                line = FRAME[side]
                along = y
            cands = []
            for fi, e, pt, t in END_TABLE:
                if side in ('top', 'bottom'):
                    dist_line = (line - pt[1]) * (1 if side == 'bottom' else -1)    # distance still to travel toward the line (positive = before the line)
                    # direction toward the line
                    dirc = t[1] * (1 if side == 'bottom' else -1)
                    if abs(pt[1] - line) > 70:
                        continue
                    if dirc < 0.5:
                        continue
                    tt = abs(line - pt[1]) / dirc
                    cross = pt[0] + t[0] * tt
                else:
                    dirc = t[0] * (1 if side == 'right' else -1)
                    if abs(pt[0] - line) > 70:
                        continue
                    if dirc < 0.5:
                        continue
                    tt = abs(line - pt[0]) / dirc
                    cross = pt[1] + t[1] * tt
                cands.append((abs(cross - along), fi, tt))
            cands.sort()
            if not cands or cands[0][0] > 10:
                out.append(dict(a, frag=None, why='no fragment end extrapolates to within 10 px of the label'))
                continue
            amb = len(cands) > 1 and cands[1][0] < cands[0][0] + 6 and cands[1][1] != cands[0][1]
            out.append(dict(a, frag=cands[0][1], dist_px=cands[0][0], ambiguous=bool(amb), n_cand=len(cands)))
        else:
            idx = tree.query_ball_point([x, y], 90.0)
            cand = {}
            for j in idx:
                dd = float(np.hypot(P[j][0] - x, P[j][1] - y))
                f = int(I[j])
                if f not in cand or dd < cand[f]:
                    cand[f] = dd
            if not cand:
                out.append(dict(a, frag=None, why='no fragment within 90 px'))
                continue
            order = sorted(cand.items(), key=lambda kv: kv[1])
            amb = len(order) > 1 and order[1][1] < 1.6 * order[0][1]
            out.append(dict(a, frag=order[0][0], dist_px=order[0][1], ambiguous=bool(amb), n_cand=len(order)))
    return out


def bfs(adj, src, n, maxd=400):
    dist = np.full(n, -1, np.int32)
    dist[src] = 0
    q = collections.deque([src])
    while q:
        u = q.popleft()
        if dist[u] >= maxd:
            continue
        for v in adj[u]:
            if dist[v] < 0:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist


def main(use_ambiguous=False):
    frags = load_fragments()
    n = len(frags)
    ad = pickle.load(open(os.path.join(C.CACHE, 'adj.pkl'), 'rb'))
    adj = [[] for _ in range(n)]
    for a, b, na, nb, dm in ad['edges']:
        adj[a].append(b)
        adj[b].append(a)
    anchors = anchors_all()
    assoc = associate(frags, anchors)
    use = [a for a in assoc if a.get('frag') is not None and (use_ambiguous or not a.get('ambiguous'))]
    print('anchors', len(anchors), 'associated', sum(1 for a in assoc if a.get('frag') is not None), 'unambiguous', len(use))
    lo = np.full(n, -10 ** 9, np.int64)
    hi = np.full(n, 10 ** 9, np.int64)
    dmin = np.full(n, 10 ** 9, np.int64)
    D = []
    for a in use:
        d = bfs(adj, a['frag'], n)
        D.append(d)
        m = d >= 0
        z = a['level_ft']
        lo[m] = np.maximum(lo[m], z - 4 * d[m])
        hi[m] = np.minimum(hi[m], z + 4 * d[m])
        dmin[m] = np.minimum(dmin[m], d[m])
    reached = hi < 10 ** 9
    conflict = reached & (lo > hi)
    exact = reached & (lo == hi)
    print('fragments', n, 'reached', int(reached.sum()), 'exact', int(exact.sum()), 'conflict', int(conflict.sum()))
    # anchor pair consistency
    bad = []
    for i, a in enumerate(use):
        for j in range(i + 1, len(use)):
            b = use[j]
            d = D[i][b['frag']]
            if d >= 0 and abs(a['level_ft'] - b['level_ft']) > 4 * d:
                bad.append((a['id'], b['id'], a['level_ft'], b['level_ft'], int(d)))
    print('anchor pairs violating |dz| <= 4 d :', len(bad))
    for t in bad[:30]:
        print('  ', t)
    pickle.dump({'lo': lo, 'hi': hi, 'exact': exact, 'conflict': conflict, 'reached': reached, 'dmin': dmin, 'assoc': assoc,
                 'bad_pairs': bad}, open(os.path.join(C.CACHE, 'levels.pkl'), 'wb'))
    L = np.array([len(c['pts']) for c in frags], float)
    print('exact length fraction of all selected-contour length: %.3f' % (L[exact].sum() / L.sum()))


if __name__ == '__main__':
    main(use_ambiguous='--amb' in sys.argv)
