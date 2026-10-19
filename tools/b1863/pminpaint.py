"""Texture-preserving inpainting by multi-scale PatchMatch with patch voting (Barnes et al. 2009 search, Wexler et al. 2007 voting).
Own implementation (numba), deterministic (seeded), no learned weights, no network.

fill(img_u8 HxWx3, tgt bool HxW [pixels to synthesise], src bool HxW [pixels that may be copied from], ...) -> uint8 HxWx3
Target pixels are initialised by diffusion at the coarsest level; each level then alternates PatchMatch (nearest source patch for every
target patch, all patch pixels must be source pixels) and voting (a target pixel becomes the weighted mean of the pixels that the
patches covering it want). Real photographic grain comes from copying real source pixels, not from diffusion.
"""
import numpy as np, cv2
from numba import njit


@njit(cache=True, fastmath=True)
def _dist(cur, px, py, qx, qy, r, best):
    s = 0.0
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            a0 = cur[py + dy, px + dx, 0] - cur[qy + dy, qx + dx, 0]
            a1 = cur[py + dy, px + dx, 1] - cur[qy + dy, qx + dx, 1]
            a2 = cur[py + dy, px + dx, 2] - cur[qy + dy, qx + dx, 2]
            s += a0 * a0 + a1 * a1 + a2 * a2
        if s > best:
            return s
    return s


@njit(cache=True)
def _init_dist(cur, ys, xs, offy, offx, dist, r):
    H, W, _ = cur.shape
    for i in range(len(ys)):
        y = ys[i]; x = xs[i]
        by = offy[y, x]; bx = offx[y, x]
        if by < r or bx < r or y < r or x < r or y >= H - r or x >= W - r or by >= H - r or bx >= W - r:
            dist[y, x] = 1e30
            continue
        dist[y, x] = _dist(cur, x, y, bx, by, r, 1e30)


@njit(cache=True)
def _pm_pass(cur, ys, xs, validc, offy, offx, dist, r, rad, lam, seed, parity):
    H, W, _ = cur.shape
    n = len(ys)
    np.random.seed(seed)
    for k in range(n):
        i = k if parity == 0 else n - 1 - k
        y = ys[i]; x = xs[i]
        if y < r or x < r or y >= H - r or x >= W - r:
            continue
        by = offy[y, x]; bx = offx[y, x]
        bd = dist[y, x]
        for t in range(2):
            if parity == 0:
                ny = y - 1 if t == 0 else y
                nx = x if t == 0 else x - 1
            else:
                ny = y + 1 if t == 0 else y
                nx = x if t == 0 else x + 1
            if ny < 0 or nx < 0 or ny >= H or nx >= W:
                continue
            if offy[ny, nx] < 0:
                continue
            cy = offy[ny, nx] + (y - ny); cx = offx[ny, nx] + (x - nx)
            if cy < r or cx < r or cy >= H - r or cx >= W - r:
                continue
            if not validc[cy, cx]:
                continue
            d = _dist(cur, x, y, cx, cy, r, bd)
            if d < bd:
                bd = d; by = cy; bx = cx
        w = rad
        while w >= 1:
            cy = by + np.random.randint(-w, w + 1); cx = bx + np.random.randint(-w, w + 1)
            if cy >= r and cx >= r and cy < H - r and cx < W - r and validc[cy, cx]:
                pen = lam * (abs(cy - y) + abs(cx - x))
                d = _dist(cur, x, y, cx, cy, r, bd - pen) + pen
                if d < bd:
                    bd = d; by = cy; bx = cx
            w //= 2
        offy[y, x] = by; offx[y, x] = bx; dist[y, x] = bd


@njit(cache=True)
def _vote(cur, ys, xs, offy, offx, dist, tgt, r, out, sig):
    H, W, _ = cur.shape
    acc = np.zeros((H, W, 3), np.float32)
    wsum = np.zeros((H, W), np.float32)
    for i in range(len(ys)):
        y = ys[i]; x = xs[i]
        by = offy[y, x]; bx = offx[y, x]
        if by < 0:
            continue
        w = np.exp(-dist[y, x] / (sig * (2 * r + 1) ** 2 * 3.0 * 255.0))
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                yy = y + dy; xx = x + dx
                if yy < 0 or xx < 0 or yy >= H or xx >= W:
                    continue
                if not tgt[yy, xx]:
                    continue
                acc[yy, xx, 0] += w * cur[by + dy, bx + dx, 0]
                acc[yy, xx, 1] += w * cur[by + dy, bx + dx, 1]
                acc[yy, xx, 2] += w * cur[by + dy, bx + dx, 2]
                wsum[yy, xx] += w
    for y in range(H):
        for x in range(W):
            if tgt[y, x] and wsum[y, x] > 0:
                out[y, x, 0] = acc[y, x, 0] / wsum[y, x]
                out[y, x, 1] = acc[y, x, 1] / wsum[y, x]
                out[y, x, 2] = acc[y, x, 2] / wsum[y, x]


def _down(a, mode):
    h, w = a.shape[:2]
    a = a[:h // 2 * 2, :w // 2 * 2]
    if a.ndim == 3:
        return cv2.resize(a, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    b = a.reshape(h // 2, 2, w // 2, 2)
    return b.all(axis=(1, 3)) if mode == 'all' else b.any(axis=(1, 3))


def fill(img, tgt, src, levels=4, iters=(10, 6, 5, 4), r=3, lam=0.01, seed=1863, sig=0.02, search=96):
    """img uint8 HxWx3; tgt, src bool (disjoint). Returns uint8 with tgt pixels synthesised from src pixels."""
    img = np.ascontiguousarray(img)
    H, W = tgt.shape
    src = src & ~tgt
    P = [(img.astype(np.float32), tgt, src)]
    for _ in range(levels - 1):
        a, t, s = P[-1]
        if min(a.shape[:2]) < 48:
            break
        P.append((_down(a, 0), _down(t, 'any'), _down(s, 'all')))
    cur = None; offy = offx = None
    rng = np.random.default_rng(seed)
    for lev in range(len(P) - 1, -1, -1):
        a, t, s = P[lev]
        h, w = t.shape
        t = t & ~s
        validc = cv2.erode(s.astype(np.uint8), np.ones((2 * r + 1, 2 * r + 1), np.uint8)).astype(bool)
        validc[:r, :] = False; validc[-r:, :] = False; validc[:, :r] = False; validc[:, -r:] = False
        vy, vx = np.nonzero(validc)
        if len(vy) == 0:
            return cv2.inpaint(img, tgt.astype(np.uint8) * 255, 3, cv2.INPAINT_TELEA)
        if cur is None:
            base = np.clip(a, 0, 255).astype(np.uint8)
            cur = cv2.inpaint(base, t.astype(np.uint8) * 255, 3, cv2.INPAINT_TELEA).astype(np.float32)
            offy = -np.ones((h, w), np.int32); offx = -np.ones((h, w), np.int32)
            ty, tx = np.nonzero(t)
            ii = rng.integers(0, len(vy), len(ty))
            offy[ty, tx] = vy[ii]; offx[ty, tx] = vx[ii]
        else:
            up = cv2.resize(cur, (w, h), interpolation=cv2.INTER_LINEAR)
            cur = np.where(t[..., None], up, a)
            ph, pw = offy.shape
            oy = np.repeat(np.repeat(offy, 2, 0), 2, 1) * 2
            ox = np.repeat(np.repeat(offx, 2, 0), 2, 1) * 2
            oy = np.pad(oy, ((0, max(0, h - oy.shape[0])), (0, max(0, w - oy.shape[1]))), mode='edge')[:h, :w]
            ox = np.pad(ox, ((0, max(0, h - ox.shape[0])), (0, max(0, w - ox.shape[1]))), mode='edge')[:h, :w]
            yy, xx = np.mgrid[0:h, 0:w]
            oy = oy + (yy % 2); ox = ox + (xx % 2)
            oy = np.clip(oy, r, h - r - 1); ox = np.clip(ox, r, w - r - 1)
            bad = t & ~validc[oy, ox]
            if bad.any():
                ii = rng.integers(0, len(vy), int(bad.sum()))
                oy[bad] = vy[ii]; ox[bad] = vx[ii]
            offy = np.where(t, oy, -1).astype(np.int32); offx = np.where(t, ox, -1).astype(np.int32)
        ys, xs = np.nonzero(t)
        ys = ys.astype(np.int32); xs = xs.astype(np.int32)
        cur = np.ascontiguousarray(cur, dtype=np.float32)
        dist = np.full((h, w), 1e30, np.float32)
        _init_dist(cur, ys, xs, offy, offx, dist, r)
        nit = iters[min(len(P) - 1 - lev, len(iters) - 1)]
        rad = min(search, max(h, w))
        for it in range(nit):
            _pm_pass(cur, ys, xs, validc, offy, offx, dist, r, rad, lam, seed + it * 7 + lev, it & 1)
            out = cur.copy()
            _vote(cur, ys, xs, offy, offx, dist, t, r, out, sig)
            cur = out
            _init_dist(cur, ys, xs, offy, offx, dist, r)
    res = np.clip(cur + 0.5, 0, 255).astype(np.uint8)
    out = img.copy()
    out[tgt] = res[tgt]
    return out
