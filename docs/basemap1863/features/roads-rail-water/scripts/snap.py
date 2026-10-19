"""Lateral snap of a registered modern line to the double line drawn on Bachelder sheet 'a'.
For each sample (every STEP m) the offset s (px along the line normal, within +-W) of the strongest drawn double line is found (same detector as the road presence check);
offsets with low score or at the window edge are dropped, the rest median-filtered (window 7) and linearly interpolated across gaps (<= 300 m);
the snapped line is the sample points moved by s px (converted to ground via FieldTF.px2en). Returns the snapped geometry (lng/lat) and statistics."""
import sys, os, json, math
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from icp import ink_map, map_coordinates
from common import *
import regtf
from shapely.geometry import LineString, shape
from scipy.signal import medfilt
STEP = 40.0
def samples(ln):
    xy = [ll2m(*c[:2]) for c in ln.coords]; out = []; acc = 0; nxt = 0
    for i in range(len(xy) - 1):
        (x1, y1), (x2, y2) = xy[i], xy[i + 1]; L = math.hypot(x2 - x1, y2 - y1)
        if L < 1e-6: continue
        tx, ty = (x2 - x1) / L, (y2 - y1) / L
        while nxt <= acc + L:
            t = (nxt - acc) / L; out.append((x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, tx, ty)); nxt += STEP
        acc += L
    xe, ye = xy[-1]; out.append((xe, ye, out[-1][2], out[-1][3]))
    return out
def snap_line(ln, W=30, min_score=15.0, widths=(4, 5, 6, 7, 8), sig=1.0):
    af = regtf.FieldTF(); ink = ink_map('a'); inkb = cv2.GaussianBlur(ink, (0, 0), sig)
    S = samples(ln); offs = np.full(len(S), np.nan); sc_ = np.zeros(len(S)); P = []; NR = []
    ss = np.arange(-W, W + 1, 1.0); taus = np.arange(-9, 10, 3.0)
    for k, (E, N, tx, ty) in enumerate(S):
        p = np.array(af.en2px(E, N)); tp = af.jac_tangent(E, N, tx, ty); nr = np.array([-tp[1], tp[0]]); P.append(p); NR.append(nr)
        if not (60 < p[0] < 4090 and 400 < p[1] < 5300): continue
        X = p[0] + taus[:, None] * tp[0] + ss[None, :] * nr[0]; Y = p[1] + taus[:, None] * tp[1] + ss[None, :] * nr[1]
        v = map_coordinates(inkb, [Y.ravel(), X.ravel()], order=1, mode='constant', cval=0).reshape(X.shape)
        prof = np.percentile(v, 25, axis=0); best = (-1, 0)
        for w in widths:
            for s in ss:
                a = np.interp(s - w / 2, ss, prof); b = np.interp(s + w / 2, ss, prof); c = min(a, b)
                if c > best[0]: best = (c, s)
        if best[0] >= min_score and abs(best[1]) < W - 1: offs[k] = best[1]; sc_[k] = best[0]
    ok = ~np.isnan(offs); idx = np.arange(len(S))
    raw = offs.copy()
    if ok.sum() >= 5:
        # median filter on the valid sequence
        v = offs[ok]; v2 = medfilt(v, 7); offs[ok] = v2
        # interpolate gaps (<= 300 m) ; outside valid extent: hold last (flag)
        filled = np.interp(idx, idx[ok], offs[ok])
        # mark long gaps
        gap = np.zeros(len(S), bool); last = None
        valid_idx = idx[ok]
        for k in range(len(S)):
            nxt_v = valid_idx[valid_idx >= k]; prv_v = valid_idx[valid_idx <= k]
            if len(nxt_v) == 0 or len(prv_v) == 0: gap[k] = True
            elif (nxt_v[0] - prv_v[-1]) * STEP > 300: gap[k] = True
        filled[gap] = 0.0
    else:
        filled = np.zeros(len(S)); gap = np.ones(len(S), bool)
    pts = []
    for k, (E, N, tx, ty) in enumerate(S):
        q = P[k] + filled[k] * NR[k]; e, n = af.px2en(q[0], q[1]); pts.append(m2ll(e, n))
    stats = dict(samples=len(S), with_detection=int(ok.sum()), gap_samples=int(gap.sum()), median_shift_m=round(float(np.median(np.abs(filled[~gap])) * 2.0), 1) if (~gap).any() else None,
                 p90_shift_m=round(float(np.percentile(np.abs(filled[~gap]), 90) * 2.0), 1) if (~gap).any() else None, max_shift_m=round(float(np.max(np.abs(filled[~gap])) * 2.0), 1) if (~gap).any() else None)
    return LineString(pts), stats, filled, gap
