"""Contour level assignment used for the Warren elevation product.

Graph : contour fragments are nodes; an edge joins two fragments that are the first contour reached from each other by perpendicular
        rays (stage 4).  Only RELIABLE edges are kept: both fragments reach each other at least 5 times, at least 16 ray hits in all,
        and the median gap is at most 60 px.  (Weak edges make shortcuts across missed contours; leave-one-out against the printed
        labels showed this filter raises the share of held-out labels predicted within one contour (4 ft) from 49 to 74 percent.)
Levels: a fragment's level (ft above Warren's datum) is estimated from the PRINTED-LABEL anchors by walking the graph:
            level(g) = level(f) + 4 ft * s_fg ,   s_fg = +1 if g is uphill of f else -1
        where the uphill direction s_fg is read from the sign of the difference of the modern 3DEP surface smoothed over 50 m, averaged along
        each fragment (orientation only; no DEM elevation is ever copied to a level).  Estimates from the nearest anchors (within one hop
        of the nearest) are combined by the median (at most 4 anchors).
Trust : hop 0 = the labelled contour itself; hop 1-3 and 4-6 are graded classes; beyond 6 hops: UNASSIGNED.
"""
import collections
import numpy as np
from matplotlib.path import Path

MIN_EACH, MIN_TOTAL, MAX_DIST = 5, 16, 60.0
MAX_HOP = 6


def reliable_edges(edges):
    return [e for e in edges if min(e[2], e[3]) >= MIN_EACH and e[2] + e[3] >= MIN_TOTAL and e[4] <= MAX_DIST]


def accept_anchors(frags, assoc):
    out = []
    for a in assoc:
        if a.get('frag') is None:
            continue
        p = frags[a['frag']]['pts']
        if a['kind'] == 'margin':
            if a['dist_px'] <= 10:
                out.append(dict(a, accepted_by='extrapolated end within 10 px of the label crossing'))
        else:
            gap = float(np.hypot(*(p[0] - p[-1])))
            inside = Path(p).contains_point((a['x'], a['y'])) if len(p) > 20 else False
            if gap <= 60 and inside:
                out.append(dict(a, accepted_by='label inside the (closed within 60 px) ring'))
            elif a['dist_px'] <= 15:
                out.append(dict(a, accepted_by='label within 15 px of the contour'))
    return out


def adjacency(n, edges):
    adj = [[] for _ in range(n)]
    for a, b, na, nb, dm in edges:
        adj[a].append(b)
        adj[b].append(a)
    return adj


def walk(adj, D, src, n, maxd=MAX_HOP):
    dist = np.full(n, -1, np.int32)
    cum = np.zeros(n)
    dist[src] = 0
    q = collections.deque([src])
    while q:
        u = q.popleft()
        if dist[u] >= maxd:
            continue
        for v in adj[u]:
            if dist[v] < 0:
                dist[v] = dist[u] + 1
                cum[v] = cum[u] + 4.0 * (1.0 if D[v] > D[u] else -1.0)
                q.append(v)
    return dist, cum


def levels(n, edges, D, anchors, maxd=MAX_HOP, exclude=None):
    """Return z (ft, nan where unassigned), hop, nvotes, spread (ft)."""
    adj = adjacency(n, edges)
    W = [(a, walk(adj, D, a['frag'], n, maxd)) for i, a in enumerate(anchors) if i != exclude]
    z = np.full(n, np.nan)
    hop = np.full(n, -1, np.int32)
    nv = np.zeros(n, np.int32)
    spread = np.zeros(n)
    for f in range(n):
        ests = [(d[f], a['level_ft'] + c[f]) for a, (d, c) in W if d[f] >= 0]
        if not ests:
            continue
        ests.sort()
        dmin = ests[0][0]
        near = [e for e in ests if e[0] <= dmin + 1][:4]
        vals = np.array([e[1] for e in near])
        z[f] = np.median(vals)
        hop[f] = dmin
        nv[f] = len(near)
        spread[f] = vals.max() - vals.min()
    return z, hop, nv, spread


def loo_cv(frags, edges, D, anchors):
    """Leave-one-anchor-out: predict each anchored fragment from the others; compare with its printed label."""
    n = len(frags)
    rows = []
    for i, a in enumerate(anchors):
        adj = adjacency(n, edges)
        ests = []
        for j, b in enumerate(anchors):
            if j == i:
                continue
            d, c = walk(adj, D, b['frag'], n)
            if d[a['frag']] >= 0:
                ests.append((int(d[a['frag']]), b['level_ft'] + c[a['frag']]))
        if not ests:
            rows.append({'id': a['id'], 'label_ft': a['level_ft'], 'pred_ft': None, 'hop': None})
            continue
        ests.sort()
        dmin = ests[0][0]
        near = [e for e in ests if e[0] <= dmin + 1][:4]
        pred = float(np.median([e[1] for e in near]))
        rows.append({'id': a['id'], 'label_ft': a['level_ft'], 'pred_ft': pred, 'err_ft': pred - a['level_ft'], 'hop': dmin, 'n_votes': len(near)})
    return rows
