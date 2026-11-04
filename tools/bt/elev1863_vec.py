"""Raster -> vector helpers for the Warren contour extraction (skeleton graph tracing, gap linking).

All functions work in scan-pixel coordinates.  Pure numpy/scipy/skimage/cv2 + numba.
"""
import numpy as np
import cv2
from skimage.morphology import skeletonize

K8 = np.array([[1, 1, 1], [1, 0, 1], [1, 1, 1]], np.uint8)
DY = np.array([-1, -1, -1, 0, 0, 1, 1, 1])
DX = np.array([-1, 0, 1, -1, 1, -1, 0, 1])


def ink_mask(gray, thr=40, bg_k=31):
    bg = cv2.medianBlur(gray, bg_k)
    return ((bg.astype(np.int16) - gray.astype(np.int16)) > thr).astype(np.uint8)


def remove_thick_and_lines(ink, open_k=5, dil_k=5, hough=True, line_w=5):
    """Return thin = ink without thick blobs (text, buildings, tree glyph cores, dashes) and without long straight lines."""
    se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (open_k, open_k))
    thick = cv2.morphologyEx(ink, cv2.MORPH_OPEN, se)
    thickd = cv2.dilate(thick, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dil_k, dil_k)))
    thin = ink * (1 - thickd)
    nline = 0
    if hough:
        lines = cv2.HoughLinesP(thin * 255, 1, np.pi / 720, threshold=60, minLineLength=100, maxLineGap=18)
        if lines is not None:
            lines = lines.reshape(-1, 4)
            nline = len(lines)
            rem = np.zeros_like(thin)
            for l in lines:
                cv2.line(rem, (int(l[0]), int(l[1])), (int(l[2]), int(l[3])), 1, line_w)
            thin = thin * (1 - rem)
    return thin, thickd, nline




def _prune_spurs(sk, spur_len=12, iters=2):
    from skan import Skeleton, summarize
    from skimage.morphology import skeletonize
    for it in range(iters):
        S = Skeleton(sk.astype(bool), keep_images=False)
        df = summarize(S, separator='_')
        bad = df.index[(df['branch_type'] == 1) & (df['branch_distance'] < spur_len)].tolist()
        if not bad:
            break
        for b in bad:
            c = S.path_coordinates(b)
            # keep the junction pixel (the end that is a junction): remove all but that end
            src = df.loc[b, ['image_coord_src_0', 'image_coord_src_1']].values.astype(int)
            dst = df.loc[b, ['image_coord_dst_0', 'image_coord_dst_1']].values.astype(int)
            deg_src = S.degrees[S.paths.indices[0]] if False else None
            for (r, cc) in c.astype(int):
                sk[r, cc] = 0
            # restore the junction end pixel: the end whose node degree >=3
            ns, nd = int(df.loc[b, 'node_id_src']), int(df.loc[b, 'node_id_dst'])
            jn = src if S.degrees[ns] >= 3 else dst
            sk[jn[0], jn[1]] = 1
        sk = skeletonize(sk.astype(bool)).astype(np.uint8)
    return sk


def build_chains(sk, spur_len=12, turn_deg=40.0, tan_len=10):
    """Skeleton -> list of chains.  A chain is an Nx2 float array of (x, y) points, assembled by pairing the most
    straight-through branches at every junction (so a contour keeps going through a crossing fence stub)."""
    from skan import Skeleton, summarize
    sk = _prune_spurs(sk.copy(), spur_len)
    S = Skeleton(sk.astype(bool), keep_images=False)
    df = summarize(S, separator='_')
    nb = len(df)
    paths = [S.path_coordinates(i)[:, ::-1].astype(np.float32) for i in range(nb)]   # (x, y)
    src = df['node_id_src'].values
    dst = df['node_id_dst'].values
    # junction table
    from collections import defaultdict
    inc = defaultdict(list)           # node -> list of (branch, end 0/1)
    for i in range(nb):
        inc[src[i]].append((i, 0))
        inc[dst[i]].append((i, 1))

    def tangent(i, end):
        p = paths[i]
        n = len(p)
        k = min(tan_len, n - 1)
        if k < 1:
            return np.array([0.0, 0.0])
        a, b = (p[0], p[k]) if end == 0 else (p[-1], p[-1 - k])
        v = b - a
        L = np.hypot(*v)
        return v / L if L > 0 else v
    link = {}                         # (branch,end) -> (branch,end)
    cosmax = np.cos(np.radians(180.0 - turn_deg))      # dot(ta, tb) must be <= cosmax (about -0.766)
    for node, lst in inc.items():
        if len(lst) < 2:
            continue
        if len(lst) == 2:
            (a, ea), (b, eb) = lst
            if a == b:
                continue
            ta, tb = tangent(a, ea), tangent(b, eb)
            if ta @ tb <= cosmax:
                link[(a, ea)] = (b, eb)
                link[(b, eb)] = (a, ea)
            continue
        cand = []
        for x in range(len(lst)):
            for y in range(x + 1, len(lst)):
                (a, ea), (b, eb) = lst[x], lst[y]
                if a == b:
                    continue
                d = tangent(a, ea) @ tangent(b, eb)
                if d <= cosmax:
                    cand.append((d, x, y))
        cand.sort()
        used = set()
        for d, x, y in cand:
            if x in used or y in used:
                continue
            used.add(x)
            used.add(y)
            (a, ea), (b, eb) = lst[x], lst[y]
            link[(a, ea)] = (b, eb)
            link[(b, eb)] = (a, ea)
    seen = np.zeros(nb, bool)
    chains = []
    for i in range(nb):
        if seen[i]:
            continue
        # walk to one end of the chain
        cur, end = i, 0        # go backwards from end 0
        guard = 0
        while (cur, end) in link and guard < 10 ** 6:
            nxt, ne = link[(cur, end)]
            if nxt == i:
                break
            cur, end = nxt, 1 - ne
            guard += 1
            if cur == i:
                break
        # now cur's 'end' is a free end (or loop); traverse forward collecting
        pts = []
        b, e = cur, end
        loop = False
        guard = 0
        while True:
            p = paths[b] if e == 0 else paths[b][::-1]
            seen[b] = True
            pts.append(p)
            ex = 1 - e
            if (b, ex) in link:
                nb_, ne = link[(b, ex)]
                if seen[nb_]:
                    loop = True
                    break
                b, e = nb_, ne
            else:
                break
            guard += 1
            if guard > 10 ** 6:
                break
        chains.append((np.concatenate(pts, 0), loop))
    return chains, sk


def _end_tangent(p, end, k=12):
    n = len(p)
    k = min(k, n - 1)
    if k < 1:
        return np.zeros(2)
    a, b = (p[0], p[k]) if end == 0 else (p[-1], p[-1 - k])
    v = a - b            # outward direction: from inside the chain toward the free end
    L = np.hypot(*v)
    return v / L if L > 0 else v


def link_chains(chains, dmax=32.0, ang_deg=35.0, min_len=8, k=12):
    """Greedy endpoint linking of open chains across gaps.  Returns list of (pts, gap_len, n_links)."""
    from scipy.spatial import cKDTree
    ch = [c for c, loop in chains if len(c) >= min_len]
    loops = [c for c, loop in chains if loop and len(c) >= min_len]
    ends = []          # (chain idx, end, point, outward tangent)
    for i, p in enumerate(ch):
        for e in (0, 1):
            pt = p[0] if e == 0 else p[-1]
            ends.append((i, e, pt, _end_tangent(p, e, k)))
    P = np.array([e[2] for e in ends])
    tree = cKDTree(P)
    pairs = tree.query_pairs(dmax, output_type='ndarray')
    cosA = np.cos(np.radians(ang_deg))
    cand = []
    for a, b in pairs:
        ia, ea, pa, ta = ends[a]
        ib, eb, pb, tb = ends[b]
        if ia == ib and len(ch[ia]) < 60:
            continue
        v = pb - pa
        d = np.hypot(*v)
        if d < 1e-6:
            cand.append((0.0, a, b))
            continue
        v = v / d
        ca = ta @ v           # outward tangent of A should point toward B
        cb = tb @ (-v)
        if ca < cosA or cb < cosA:
            continue
        # prefer short, well-aligned links; penalise kinks between the two tangents
        score = d * (1.0 + 2.0 * (1.0 - min(ca, cb)))
        cand.append((score, a, b))
    cand.sort()
    used = set()
    link = {}
    for s, a, b in cand:
        if a in used or b in used:
            continue
        used.add(a)
        used.add(b)
        link[a] = b
        link[b] = a
    # assemble
    endidx = {}
    for n, (i, e, pt, t) in enumerate(ends):
        endidx[(i, e)] = n
    seen = [False] * len(ch)
    out = []
    for i in range(len(ch)):
        if seen[i]:
            continue
        # find the start by walking backwards
        cur, end = i, 0
        guard = 0
        while endidx[(cur, end)] in link:
            nxt = link[endidx[(cur, end)]]
            ni, ne = ends[nxt][0], ends[nxt][1]
            if ni == i:
                break
            cur, end = ni, 1 - ne
            guard += 1
            if guard > 100000:
                break
        pts = []
        gaps = 0.0
        nl = 0
        b, e = cur, end
        guard = 0
        while True:
            p = ch[b] if e == 0 else ch[b][::-1]
            seen[b] = True
            if pts:
                gaps += float(np.hypot(*(p[0] - pts[-1][-1])))
                nl += 1
            pts.append(p)
            ex = 1 - e
            n = endidx[(b, ex)]
            if n in link:
                nxt = link[n]
                ni, ne = ends[nxt][0], ends[nxt][1]
                if seen[ni]:
                    break
                b, e = ni, ne
            else:
                break
            guard += 1
            if guard > 100000:
                break
        out.append((np.concatenate(pts, 0), gaps, nl))
    for p in loops:
        out.append((p, 0.0, 0))
    return out


def resample(pts, step=3.0):
    d = np.hypot(*np.diff(pts, axis=0).T)
    s = np.concatenate([[0], np.cumsum(d)])
    if s[-1] < step:
        return pts[[0, -1]].astype(np.float64), np.array([0, s[-1]])
    t = np.arange(0, s[-1], step)
    x = np.interp(t, s, pts[:, 0])
    y = np.interp(t, s, pts[:, 1])
    return np.stack([x, y], 1), t


def straight_mask(pts, win=100.0, tol=4.0, step=4.0, smooth=0):
    """Boolean mask over resampled points that lie inside a window of length `win` whose max deviation from its chord <= tol.
    smooth: moving-average half width in samples applied before the test (removes zig-zag of worm fences)."""
    r, t = resample(pts, step)
    if smooth and len(r) > 2 * smooth + 2:
        k = 2 * smooth + 1
        ker = np.ones(k) / k
        rp = np.pad(r, ((smooth, smooth), (0, 0)), mode='edge')
        r = np.stack([np.convolve(rp[:, 0], ker, 'valid'), np.convolve(rp[:, 1], ker, 'valid')], 1)
    n = len(r)
    k = int(win / step)
    flag = np.zeros(n, bool)
    if n <= k:
        return r, t, flag
    for i in range(0, n - k, 2):
        a, b = r[i], r[i + k]
        v = b - a
        L = np.hypot(*v)
        if L < 0.8 * win:
            continue
        nrm = np.array([-v[1], v[0]]) / L
        dev = np.abs((r[i:i + k + 1] - a) @ nrm).max()
        if dev <= tol:
            flag[i:i + k + 1] = True
    return r, t, flag


def chain_overlaps(chains_pts, shape, strip=1500, thick=3, min_pts=25):
    """Pairs of chains whose drawn (thickness `thick`) lines overlap.  chains_pts: list of Nx2 float arrays (x, y).
    Returns dict {(i, j): overlapping_pixel_count}."""
    import collections
    H, W = shape
    bbox = np.array([[p[:, 0].min(), p[:, 1].min(), p[:, 0].max(), p[:, 1].max()] if len(p) else [0, 0, 0, 0] for p in chains_pts])
    ok = np.array([len(p) >= min_pts for p in chains_pts])
    pairs = collections.Counter()
    for y0 in range(0, H, strip):
        y1 = min(H, y0 + strip)
        sel = np.where(ok & (bbox[:, 3] >= y0 - 2) & (bbox[:, 1] <= y1 + 2))[0]
        a = np.zeros((y1 - y0, W), np.int32)
        b = np.zeros((y1 - y0, W), np.int32)
        off = np.array([0, y0], np.float32)
        for i in sel:
            q = np.round(chains_pts[i] - off).astype(np.int32).reshape(-1, 1, 2)
            cv2.polylines(a, [q], False, int(i + 1), thick)
        for i in sel[::-1]:
            q = np.round(chains_pts[i] - off).astype(np.int32).reshape(-1, 1, 2)
            cv2.polylines(b, [q], False, int(i + 1), thick)
        m = (a != b) & (a > 0) & (b > 0)
        ys, xs = np.nonzero(m)
        if len(ys):
            pa = a[ys, xs] - 1
            pb = b[ys, xs] - 1
            for u, v in zip(pa.tolist(), pb.tolist()):
                if u != v:
                    pairs[(min(u, v), max(u, v))] += 1
    return pairs
