"""Removal methods under test. All work on uint8 RGB crops (H,W,3) and a bool mask (H,W) = pixels to replace.

  telea     OpenCV Telea fast-marching inpainting (diffusion; blurs anything wider than a few pixels)
  ns        OpenCV Navier-Stokes inpainting (same family)
  exemplar  patch-based, texture-aware: the mask is cut into chunks; for each chunk the best-matching donor patch is
            searched among translations of the chunk's own shape inside the unmasked surroundings, scored on the ring of
            known pixels around the chunk (SSD) plus a texture-statistics penalty (std and mean of the donor body vs the ring);
            the donor body is copied in with Poisson (seamless) cloning, so colour and illumination follow the surroundings
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


def exemplar(img, mask, cell=40, ring=5, tries=700, search=None, seed=1863, grow=1):
    rng = np.random.default_rng(seed)
    H, W = mask.shape
    work = img.copy()
    known = ~cv2.dilate(mask.astype(np.uint8), np.ones((2 * (ring + 2) + 1,) * 2, np.uint8)).astype(bool)   # donor pixels must be clean
    fill = cv2.dilate(mask.astype(np.uint8), np.ones((2 * grow + 1,) * 2, np.uint8)).astype(bool)
    clean_ok = ~cv2.dilate(mask.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    imf = img.astype(np.float32)
    for m in _chunks(fill, cell):
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        bh, bw = y1 - y0, x1 - x0
        S = m[y0:y1, x0:x1]
        pad = ring
        Y0, Y1, X0, X1 = max(y0 - pad, 0), min(y1 + pad, H), max(x0 - pad, 0), min(x1 + pad, W)
        win_m = m[Y0:Y1, X0:X1]
        ringm = cv2.dilate(win_m.astype(np.uint8), np.ones((2 * ring + 1,) * 2, np.uint8)).astype(bool) & ~win_m & ~fill[Y0:Y1, X0:X1]
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
            if abs(dy) < 2 and abs(dx) < 2:
                continue
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
            pen = abs(body.std(axis=0).mean() - rstd) * 4.0 + np.abs(body.mean(axis=0) - rmean).mean() * 0.5
            d = ssd + pen
            if d < bd:
                bd, best = d, (dy, dx)
        if best is None:
            continue
        dy, dx = best
        src = img[Y0 + dy:Y0 + dy + hh, X0 + dx:X0 + dx + ww]
        # Poisson clone of the donor body into the target, inside the chunk shape
        msk = (win_m.astype(np.uint8)) * 255
        if win_m.sum() < 12 or min(hh, ww) < 6:
            work[Y0:Y1, X0:X1][win_m] = src[win_m]
            continue
        # seamlessClone needs the mask away from the border: pad by 2
        P = 2
        srcp = cv2.copyMakeBorder(src, P, P, P, P, cv2.BORDER_REFLECT)
        mskp = cv2.copyMakeBorder(msk, P, P, P, P, cv2.BORDER_CONSTANT, value=0)
        dstp = cv2.copyMakeBorder(work[Y0:Y1, X0:X1], P, P, P, P, cv2.BORDER_REFLECT)
        yy, xx = np.nonzero(win_m)
        centre = (int((xx.min() + xx.max() + 1) // 2) + P, int((yy.min() + yy.max() + 1) // 2) + P)   # seamlessClone puts the centre of the mask's bounding box here
        try:
            out = cv2.seamlessClone(srcp, dstp, mskp, centre, cv2.NORMAL_CLONE)
            work[Y0:Y1, X0:X1][win_m] = out[P:P + hh, P:P + ww][win_m]
        except cv2.error:
            work[Y0:Y1, X0:X1][win_m] = src[win_m]
    return work


METHODS = {'telea': telea, 'ns': ns, 'exemplar': exemplar}
