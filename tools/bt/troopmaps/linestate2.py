"""linestate2.py : line STATE of a Bachelder 1876 line symbol by nearest legend swatch.
Reference swatches (First Position / Intermediate / Evening / All Day) are measured on the same sheet and colour as the map symbol (legend at the foot of each sheet),
with the same masks and feature function; a symbol is classified only when its distance to the nearest swatch is small and clearly below the second nearest (else None).
Features of the bar component nearest the anchor, in its own rotated frame: W (rows with ink), fill (mean ink over the span), asym (left/right half difference), gaps (empty rows inside the span)."""
import cv2, numpy as np, json, os
def mask(c, side):
    c = c.astype(int); b, g, r = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    m = (r - np.maximum(g, b) > 60) if side == 'CS' else ((b - r > 8) & (b > 70) & (r < 120))
    return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
def feats(m, cx, cy, rad):
    n, lab, st, cen = cv2.connectedComponentsWithStats(m, 8); best = None
    for i in range(1, n):
        a = st[i][4]
        if a < 150: continue
        d = np.hypot(cen[i][0] - cx, cen[i][1] - cy)
        if d > rad: continue
        pts = np.column_stack(np.where(lab == i))[:, ::-1].astype(np.float32)
        (rx, ry), (rw, rh), ang = cv2.minAreaRect(pts); L, W = max(rw, rh), min(rw, rh)
        if L < 40 or L / max(W, 1) < 2.2: continue
        sc = a / (1 + d / 40.0)
        if best is None or sc > best[0]: best = (sc, i, rx, ry, rw, rh, ang)
    if best is None: return None
    _, i, rx, ry, rw, rh, ang = best
    if rw < rh: ang += 90; rw, rh = rh, rw
    M = cv2.getRotationMatrix2D((rx, ry), ang, 1.0)
    R = cv2.warpAffine((lab == i).astype(np.uint8), M, (m.shape[1], m.shape[0]), flags=cv2.INTER_NEAREST)
    L, W = int(rw), int(rh); x0, x1 = max(int(rx - L / 2) + 3, 0), int(rx + L / 2) - 3; y0, y1 = max(int(ry - W / 2) - 2, 0), int(ry + W / 2) + 3
    sub = R[y0:y1, x0:x1]
    if sub.shape[0] < 3 or sub.shape[1] < 20: return None
    pr = sub.mean(axis=1); rows = np.where(pr > 0.25)[0]
    if len(rows) == 0: return None
    span = rows.max() - rows.min() + 1; h = sub.shape[1] // 2
    pl, pr2 = sub[:, :h].mean(axis=1), sub[:, h:].mean(axis=1)
    asym = float(np.abs(pl - pr2).sum() / max(pl.sum() + pr2.sum(), 1e-6))
    return np.array([span, float(pr[rows.min():rows.max() + 1].mean()), asym, float((pr[rows.min():rows.max() + 1] > 0.6).sum())])
SCALE = np.array([6.0, 0.15, 0.2, 4.0])      # feature tolerances
NAMES = ['first_position', 'intermediate', 'evening', 'all_day']
def refs(im, sheet, side):
    y0, y1, xa, xb = {('b', 'US'): (10380, 10600, 2480, 2680), ('b', 'CS'): (10380, 10600, 2700, 2900), ('c', 'US'): (10500, 10800, 2480, 2680), ('c', 'CS'): (10500, 10800, 2700, 2900)}.get((sheet, side), (None,) * 4)
    if y0 is None: return None
    reg = im[y0:y1, xa:xb]; m = mask(reg, side)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m, 8)
    comps = sorted([(st[i][1], i) for i in range(1, n) if st[i][2] > 80 and st[i][3] < 40])
    if len(comps) != 4: return None
    out = []
    for _, i in comps:
        x, y, w, h, a = st[i]; sub = np.zeros_like(m); sub[lab == i] = 1
        f = feats(sub, x + w / 2, y + h / 2, 80); out.append(f)
    return out
def classify(im, ref, ax, ay, aw, side, pad=40):
    r = max(aw, 60) + 20; x0, y0 = max(ax - r - pad, 0), max(ay - r - pad, 0)
    c = im[y0:ay + r + pad, x0:ax + r + pad]; m = mask(c, side)
    f = feats(m, ax - x0, ay - y0, r)
    if f is None or ref is None or any(x is None for x in ref): return None, {}
    d = np.array([np.linalg.norm((f - x) / SCALE) for x in ref]); o = np.argsort(d)
    mets = dict(span=round(float(f[0]), 1), fill=round(float(f[1]), 2), asym=round(float(f[2]), 2), dense=int(f[3]), d_best=round(float(d[o[0]]), 2), d_second=round(float(d[o[1]]), 2))
    if d[o[0]] <= 1.2 and d[o[1]] - d[o[0]] >= 0.35: return NAMES[o[0]], mets
    return None, mets
