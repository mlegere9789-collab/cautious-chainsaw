"""linestate.py : classify the line STATE of a Bachelder 1876 line symbol from scan pixels, following the legend swatches of sheet 3
(measured native: First Position = hollow bar, top rail + tapered fill (left and right halves differ); Intermediate = thin line <= 5 rows;
 Evening = solid bar 16 rows; All Day = thin top rail, 3-6 hollow rows, solid band about 9 rows, halves alike).
classify(im, ax, ay, aw, side) -> (state or None, metrics). Rules are fixed from the legend; the result is checked by eye on samples (see notes)."""
import cv2, numpy as np
def ink(c, side):
    c = c.astype(int); b, g, r = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    if side == 'CS': m = (r - np.maximum(g, b) > 40)
    else: m = (b - r > 8) & (b > 70) & (r < 120)
    return m.astype(np.uint8)
def _best_component(m, cx, cy, rad):
    n, lab, st, cen = cv2.connectedComponentsWithStats(m, 8); best = None
    for i in range(1, n):
        a = st[i][4]
        if a < 200: continue
        d = np.hypot(cen[i][0] - cx, cen[i][1] - cy)
        if d > rad: continue
        pts = np.column_stack(np.where(lab == i))[:, ::-1].astype(np.float32)
        (rx, ry), (rw, rh), ang = cv2.minAreaRect(pts); L, W = max(rw, rh), min(rw, rh)
        if L < 40 or L / max(W, 1) < 2.2: continue
        sc = a / (1 + d / 40.0)
        if best is None or sc > best[0]: best = (sc, i, rx, ry, rw, rh, ang)
    return best, lab
def profile(m, cx, cy, rad):
    best, lab = _best_component(m, cx, cy, rad)
    if best is None: return None
    _, i, rx, ry, rw, rh, ang = best
    if rw < rh: ang += 90; rw, rh = rh, rw
    M = cv2.getRotationMatrix2D((rx, ry), ang, 1.0)
    R = cv2.warpAffine((lab == i).astype(np.uint8), M, (m.shape[1], m.shape[0]), flags=cv2.INTER_NEAREST)
    L, W = int(rw), int(rh); x0, x1 = int(rx - L / 2) + 3, int(rx + L / 2) - 3; y0, y1 = int(ry - W / 2) - 2, int(ry + W / 2) + 3
    sub = R[max(y0, 0):y1, max(x0, 0):x1]
    if sub.shape[0] < 3 or sub.shape[1] < 20: return None
    h = sub.shape[1] // 2
    Ra = cv2.warpAffine(m, M, (m.shape[1], m.shape[0]), flags=cv2.INTER_NEAREST)
    ys = np.where(sub.mean(axis=1) > 0.25)[0]; top = max(y0, 0) + int(ys.min()); bot = max(y0, 0) + int(ys.max())
    def dens(a, b):
        a, b = max(a, 0), max(b, 0)
        return float(Ra[a:b, max(x0, 0):x1].mean(axis=1).max()) if b > a else 0.0
    rail = max(dens(top - 10, top - 2), dens(bot + 3, bot + 11))
    return dict(L=L, W=W, prof=sub.mean(axis=1), pl=sub[:, :h].mean(axis=1), pr=sub[:, h:].mean(axis=1), area=int(sub.sum()), rail=rail)
def classify_profile(P):
    if P is None: return None, {}
    pr = P['prof']; dense = pr > 0.6; rows = np.where(pr > 0.25)[0]
    if len(rows) == 0: return None, {}
    span = rows.max() - rows.min() + 1
    # longest dense run
    run = best = 0
    for v in dense: run = run + 1 if v else 0; best = max(best, run)
    gap = int(span - dense.sum())
    asym = float(np.abs(P['pl'] - P['pr']).sum() / max(P['pl'].sum() + P['pr'].sum(), 1e-6))
    rail = P['rail']
    mets = dict(L=P['L'], span=int(span), dense_run=int(best), dense_rows=int(dense.sum()), gap_rows=gap, asym=round(asym, 2), rail=round(rail, 2))
    if span <= 8 and best <= 5 and rail < 0.25: st = 'intermediate'
    elif gap >= 3 and asym >= 0.25: st = 'first_position'
    elif best >= 13: st = 'evening'
    elif 6 <= best <= 12 and rail >= 0.25: st = 'all_day'
    elif 6 <= best <= 12: st = 'evening'      # narrower solid bar, no parallel rail
    else: st = None
    return st, mets
def classify(im, ax, ay, aw, side, pad=50):
    r = max(aw, 60) + 20; x0, y0 = max(ax - r - pad, 0), max(ay - r - pad, 0)
    c = im[y0:ay + r + pad, x0:ax + r + pad]; m = cv2.morphologyEx(ink(c, side), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    return classify_profile(profile(m, ax - x0, ay - y0, r))
def calibrate(im):
    H = im.shape[0]; out = {}
    for name, (y0, y1) in dict(first=(25, 45), intermediate=(57, 70), evening=(82, 104), allday=(118, 140)).items():
        c = im[H - 900 + y0 - 12:H - 900 + y1 + 12, 2470:2630]; m = ink(c, 'US')
        out[name] = classify_profile(profile(m, 80, 12 + (y1 - y0) // 2, 120))
    return out
if __name__ == '__main__':
    im = cv2.imread('tmp/troopmaps/full_c.png'); print(calibrate(im))
