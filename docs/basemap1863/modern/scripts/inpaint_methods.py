"""Removal methods under test. All work on uint8 RGB crops (H,W,3) and a bool mask (H,W) = pixels to replace.

  telea     OpenCV Telea fast-marching inpainting (diffusion; blurs anything wider than a few pixels)
  ns        OpenCV Navier-Stokes inpainting (same family)
  exemplar  patch-based, texture-aware: the mask is cut into chunks; for each chunk the best-matching donor patch is
            searched among translations of the chunk's own shape inside the unmasked surroundings, scored on the ring of
            known pixels around the chunk (SSD) plus a texture-statistics penalty (std and mean of the donor body vs the ring);
            the donor body is copied in with a smooth colour and illumination correction fitted on the known ring (an own membrane, see the comment in the code), so colour follows the surroundings
            and the grain is real photographic grain, not diffusion. No network, no learned weights, deterministic (seeded).

A learned inpainter (LaMa, Apache-2.0) was considered; its weights are distributed as a pickled checkpoint or a third-party
TorchScript file, neither of which can be audited here, so it was not downloaded (IMAGERY-CHOICE.md, section 5).
"""
import numpy as np, cv2


def telea(img, mask, radius=5):
    return cv2.inpaint(img, mask.astype(np.uint8) * 255, radius, cv2.INPAINT_TELEA)


def ns(img, mask, radius=5):
    return cv2.inpaint(img, mask.astype(np.uint8) * 255, radius, cv2.INPAINT_NS)


def _chunks(mask, cell):
    """split the mask into chunks no larger than cell x cell px (connected parts inside each grid cell); order: row-major"""
    H, W = mask.shape
    out = []
    for r in range(0, H, cell):
        for c in range(0, W, cell):
            sub = mask[r:r + cell, c:c + cell]
            if not sub.any():
                continue
            n, lab = cv2.connectedComponents(sub.astype(np.uint8), connectivity=8)
            for k in range(1, n):
                m = np.zeros_like(mask)
                m[r:r + cell, c:c + cell] = lab == k
                if m.sum() >= 3:
                    out.append(m)
    return out


def exemplar(img, mask, cell=48, ring=5, tries=2500, search=None, seed=1863, grow=2, donor_clear=8):
    rng = np.random.default_rng(seed)
    H, W = mask.shape
    work = img.copy()
    known = ~cv2.dilate(mask.astype(np.uint8), np.ones((2 * (ring + 2) + 1,) * 2, np.uint8)).astype(bool)   # donor pixels must be clean
    fill = cv2.dilate(mask.astype(np.uint8), np.ones((2 * grow + 1,) * 2, np.uint8)).astype(bool)
    clean_ok = ~cv2.dilate(mask.astype(np.uint8), np.ones((2 * donor_clear + 1,) * 2, np.uint8)).astype(bool)   # donors keep donor_clear px away from every masked pixel (masks under-cover edges, shoulders, walls)
    imf = img.astype(np.float32)
    done = np.zeros((H, W), bool)
    nch = 0
    for m in _chunks(fill, cell):
        nch += 1
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        bh, bw = y1 - y0, x1 - x0
        S = m[y0:y1, x0:x1]
        pad = ring
        Y0, Y1, X0, X1 = max(y0 - pad, 0), min(y1 + pad, H), max(x0 - pad, 0), min(x1 + pad, W)
        win_m = m[Y0:Y1, X0:X1]
        pending = fill[Y0:Y1, X0:X1] & ~done[Y0:Y1, X0:X1]            # not yet filled: unusable as context; chunks already filled count as known
        ringm = cv2.dilate(win_m.astype(np.uint8), np.ones((2 * ring + 1,) * 2, np.uint8)).astype(bool) & ~win_m & ~pending
        if ringm.sum() < 8:
            continue
        tgt = work[Y0:Y1, X0:X1].astype(np.float32)
        rm_vals = tgt[ringm]
        rstd = rm_vals.std(axis=0).mean()
        rmean = rm_vals.mean(axis=0)
        hh, ww = Y1 - Y0, X1 - X0
        R = search or max(60, 4 * max(bh, bw))
        best, bd = None, 1e30
        for _ in range(tries):
            dy = int(rng.integers(-R, R + 1)); dx = int(rng.integers(-R, R + 1))
            if abs(dy) < bh + 2 and abs(dx) < bw + 2:
                continue          # a donor must not overlap the chunk's own neighbourhood
            sy0, sx0 = Y0 + dy, X0 + dx
            if sy0 < 0 or sx0 < 0 or sy0 + hh > H or sx0 + ww > W:
                continue
            ok = clean_ok[sy0:sy0 + hh, sx0:sx0 + ww]
            # donor body (the area under the chunk) and the donor ring must be clean
            if not ok[win_m].all() or not ok[ringm].all():
                continue
            don = imf[sy0:sy0 + hh, sx0:sx0 + ww]
            ssd = ((don[ringm] - rm_vals) ** 2).mean()
            body = don[win_m]
            pen = abs(body.std(axis=0).mean() - rstd) * 4.0 + np.abs(body.mean(axis=0) - rmean).mean() * 1.5
            d = ssd + pen
            if d < bd:
                bd, best = d, (dy, dx)
        if best is None:
            continue   # no clean donor of this shape nearby: left for the Telea fallback below, and counted
        dy, dx = best
        src = img[Y0 + dy:Y0 + dy + hh, X0 + dx:X0 + dx + ww]
        # colour/illumination matching: delta = (target - donor) on the known pixels around the chunk, smoothed by normalised convolution (sigma 5 px)
        # and extrapolated under the chunk; the donor body plus that smooth delta replaces the chunk. (cv2.seamlessClone was tried first: its boundary
        # condition is read from the mask's own edge pixels, which lie on the object being removed, so it keeps the object. Measured, not assumed.)
        known_w = (~pending & ~win_m).astype(np.float32)
        dl = (tgt - src.astype(np.float32))
        num = np.stack([cv2.GaussianBlur(dl[..., c] * known_w, (0, 0), 5) for c in range(3)], axis=-1)
        den = cv2.GaussianBlur(known_w, (0, 0), 5)[..., None]
        gm = (dl * known_w[..., None]).sum(axis=(0, 1)) / max(known_w.sum(), 1)
        delta = np.clip(np.where(den > 1e-3, num / np.maximum(den, 1e-3), gm), -30, 30)
        lo = np.percentile(rm_vals, 3, axis=0) - 12; hi = np.percentile(rm_vals, 97, axis=0) + 12   # the fill may not be darker or brighter than the surroundings it must blend with (no shadow blotches from the donor)
        res = np.clip(np.clip(src.astype(np.float32) + delta, lo, hi), 0, 255).astype(np.uint8)
        work[Y0:Y1, X0:X1][win_m] = res[win_m]
        done[Y0:Y1, X0:X1] |= win_m
    rest = fill & ~done
    exemplar.last = dict(chunks=nch, fallback_px=int(rest.sum()), fill_px=int(fill.sum()))
    if rest.any():
        work = cv2.inpaint(work, rest.astype(np.uint8) * 255, 5, cv2.INPAINT_TELEA)
    return work


METHODS = {'telea': telea, 'ns': ns, 'exemplar': exemplar}
