"""Image quilting (Efros and Freeman 2001) with a colour guide, for target regions too wide for patch filling.

Blocks are copied from a bank of REAL photograph blocks (the same NAIP scene), chosen by (1) closeness of the block's mean colour and
texture level to a smooth guide computed from the known surroundings, (2) overlap error against everything already known (context and
earlier blocks), and joined along a minimum-error seam. Raster order, seeded, deterministic. No learned weights.
"""
import numpy as np, cv2
from scipy.spatial import cKDTree

class Bank:
    """blocks: (N,B,B,3) uint8; feat: (N,4) mean R,G,B and mean gradient (texture level)"""
    def __init__(self, blocks):
        self.blocks = blocks
        self.B = blocks.shape[1]
        f = blocks.astype(np.float32)
        m = f.mean((1, 2))
        lum = f.mean(3)
        gx = np.abs(np.diff(lum, axis=2)).mean((1, 2)); gy = np.abs(np.diff(lum, axis=1)).mean((1, 2))
        self.tex = (gx + gy) / 2
        self.feat = np.concatenate([m, self.tex[:, None] * 3.0], 1)
        self.tree = cKDTree(self.feat)

def block_stats(img_block):
    f = img_block.astype(np.float32)
    lum = f.mean(2)
    return f.mean((0, 1)), (np.abs(np.diff(lum, axis=1)).mean() + np.abs(np.diff(lum, axis=0)).mean()) / 2

def _vseam(err):
    """err (h, w): minimal vertical seam, returns cut column per row (pixels with col < cut keep old)"""
    h, w = err.shape
    cost = err.copy()
    for i in range(1, h):
        prev = cost[i - 1]
        left = np.concatenate([[1e30], prev[:-1]]); right = np.concatenate([prev[1:], [1e30]])
        cost[i] += np.minimum(prev, np.minimum(left, right))
    j = int(np.argmin(cost[-1]))
    cut = np.zeros(h, np.int32)
    for i in range(h - 1, -1, -1):
        cut[i] = j
        if i > 0:
            lo = max(j - 1, 0); hi = min(j + 2, w)
            j = lo + int(np.argmin(cost[i - 1, lo:hi]))
    return cut

def quilt(canvas, target, bank, guide, guide_tex=None, ov=6, step=None, k=160, seed=1, topn=4, region_ok=None):
    """canvas float32 (h,w,3) (modified in place), target bool (h,w) pixels to synthesise, guide float32 (h,w,3) smooth colour.
    guide_tex: float or (h,w) texture level wanted (default: bank median). Returns canvas."""
    B = bank.B
    step = step or (B - ov)
    h, w = target.shape
    rng = np.random.default_rng(seed)
    ys, xs = np.nonzero(target)
    if len(ys) == 0:
        return canvas
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    placed = np.zeros((h, w), bool)
    fixed = ~target
    pad = B
    cv = np.pad(canvas, ((pad, pad + B), (pad, pad + B), (0, 0)), mode='edge')
    tg = np.pad(target, ((pad, pad + B), (pad, pad + B)), constant_values=False)
    pl = np.pad(placed, ((pad, pad + B), (pad, pad + B)), constant_values=False)
    gd = np.pad(guide, ((pad, pad + B), (pad, pad + B), (0, 0)), mode='edge')
    fx = ~tg
    medtex = float(np.median(bank.tex)) if guide_tex is None else None
    gtx = None if guide_tex is None else np.pad(np.asarray(guide_tex, np.float32), ((pad, pad + B), (pad, pad + B)), mode='edge')
    cvf = cv
    blocks = bank.blocks
    for by in range(y0 - 0, y1, step):
        for bx in range(x0 - 0, x1, step):
            Y = by + pad; X = bx + pad
            t = tg[Y:Y + B, X:X + B]
            if not t.any():
                continue
            if region_ok is not None and not region_ok[min(by, h - 1), min(bx, w - 1)]:
                pass
            known = fx[Y:Y + B, X:X + B] | pl[Y:Y + B, X:X + B]
            # guide at the block: mean of the guide over the block's target pixels
            gm = gd[Y:Y + B, X:X + B][t].mean(0)
            tex = medtex if gtx is None else float(gtx[Y:Y + B, X:X + B][t].mean())
            q = np.concatenate([gm, [tex * 3.0]])
            kk = min(k, len(blocks))
            _, idx = bank.tree.query(q, k=kk)
            idx = np.atleast_1d(idx)
            cand = blocks[idx].astype(np.float32)                    # (k,B,B,3)
            nk = int(known.sum())
            if nk > 0:
                cur = cv[Y:Y + B, X:X + B]
                d = ((cand - cur[None]) ** 2).sum(3)                  # (k,B,B)
                err = (d * known[None]).sum((1, 2)) / nk
                # prefer candidates whose colour is close to the guide too (weak)
                order = np.argsort(err)[:topn]
                j = order[rng.integers(0, len(order))] if len(order) > 1 else order[0]
                # accept the best few with errors within 15 percent of the minimum
                good = [o for o in order if err[o] <= err[order[0]] * 1.15 + 1.0]
                j = good[rng.integers(0, len(good))]
            else:
                j = rng.integers(0, kk)
            c = cand[j]
            # remove the block-level colour offset from the guide (stops the grid of blocks showing as stripes); texture is unchanged
            dc = np.clip(gm - c[t].mean(0), -14, 14) * 0.8
            c = c + dc
            # seam against already placed pixels
            P = pl[Y:Y + B, X:X + B]
            keep_old = np.zeros((B, B), bool)
            if P.any():
                e = ((c - cv[Y:Y + B, X:X + B]) ** 2).sum(2)
                # left strip
                Pl = P[:, :ov]
                if Pl.any():
                    el = np.where(Pl, e[:, :ov], 0.0)
                    cut = _vseam(el)
                    cols = np.arange(ov)[None, :]
                    ko = cols < cut[:, None]
                    keep_old[:, :ov] |= ko & Pl
                Pt = P[:ov, :]
                if Pt.any():
                    et = np.where(Pt, e[:ov, :], 0.0).T
                    cut = _vseam(et)
                    rows = np.arange(ov)[:, None]
                    ko = rows < cut[None, :]
                    keep_old[:ov, :] |= ko & Pt
                # placed pixels elsewhere in the block (rare) keep old
                rest = P.copy(); rest[:, :ov] = False; rest[:ov, :] = False
                keep_old |= rest
            wr = t & ~keep_old
            sub = cv[Y:Y + B, X:X + B]
            sub[wr] = c[wr]
            pl[Y:Y + B, X:X + B] |= wr
    out = cv[pad:pad + h, pad:pad + w]
    canvas[...] = out
    return canvas

def boundary_match(canvas, target, sigma=10.0, ring=3):
    """Low-frequency colour correction: the mismatch between the synthesised pixels just inside the region edge and the known pixels just outside
    is spread inward with a Gaussian falloff, so the fill meets its surroundings without a colour step. Interior texture is unchanged."""
    t = target.astype(np.uint8)
    k = np.ones((2 * ring + 1, 2 * ring + 1), np.uint8)
    inner = target & ~cv2.erode(t, k).astype(bool)
    outer = cv2.dilate(t, k).astype(bool) & ~target
    if not inner.any() or not outer.any():
        return canvas
    f = canvas.astype(np.float32)
    # per pixel local means of the inside ring and the outside ring
    def lm(m, s):
        mm = m.astype(np.float32)
        num = np.stack([cv2.GaussianBlur(f[..., c] * mm, (0, 0), s) for c in range(3)], -1)
        den = cv2.GaussianBlur(mm, (0, 0), s)[..., None]
        return num / np.maximum(den, 1e-4), den[..., 0]
    mi, di = lm(inner, 6.0)
    mo, do_ = lm(outer, 6.0)
    delta = np.where(((di > 1e-3) & (do_ > 1e-3))[..., None], mo - mi, 0)
    # delta defined near the boundary; extend inward by normalised blur weighted by closeness
    wgt = (inner & (do_ > 1e-3)).astype(np.float32)
    num = np.stack([cv2.GaussianBlur(delta[..., c] * wgt, (0, 0), sigma) for c in range(3)], -1)
    den = cv2.GaussianBlur(wgt, (0, 0), sigma)[..., None]
    corr = num / np.maximum(den, 1e-4)
    # fade with distance from the boundary: full at the edge, zero deeper than 3 sigma
    dist = cv2.distanceTransform(target.astype(np.uint8), cv2.DIST_L2, 3)
    fade = np.exp(-dist / sigma)[..., None]
    corr = np.clip(corr, -25, 25) * fade
    out = canvas.copy()
    out[target] = (canvas + corr)[target]
    return out
