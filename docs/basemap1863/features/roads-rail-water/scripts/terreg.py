"""Local terrain registration of Bachelder sheet 'a': black-ink density vs DEM slope. Estimates local offsets (px) relative to a base transform."""
import os, sys, json, math
import numpy as np, cv2, psutil
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from georef import *
try: psutil.Process().nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception: pass
cv2.setNumThreads(2)
MAPS = os.path.join(ROOT, 'tmp', 'b1863', 'roads', 'maps')
meta = json.load(open(os.path.join(ROOT, 'tmp/b1863/roads/dem2m_meta.json')))
SLOPE = np.load(os.path.join(ROOT, 'tmp/b1863/roads/dem2m_slope.npy'))
def black_density(sheet='a', sig=5.0):
    im = cv2.imread(os.path.join(MAPS, f'bach1879_{sheet}.50.jpg'))
    mx = im.max(axis=2).astype(np.float32)
    bg = cv2.GaussianBlur(mx, (0, 0), 25)
    ink = ((bg - mx) > 45) & (mx < 130)          # dark neutral ink only (not red/blue troop symbols)
    d = cv2.GaussianBlur(ink.astype(np.float32), (0, 0), sig)
    return d
def sample_slope_into_map(af, x0, y0, w, h, step=1.0):
    """For map pixel grid (x0..x0+w, y0..y0+h) return slope sampled from DEM under transform af (px = M [E,N,1])."""
    xs, ys = np.meshgrid(np.arange(x0, x0 + w, step), np.arange(y0, y0 + h, step))
    A = af.M[:, :2]; t = af.M[:, 2]
    Ainv = np.linalg.inv(A)
    P = np.stack([xs.ravel() - t[0], ys.ravel() - t[1]])
    EN = Ainv @ P
    col = (EN[0] - meta['E0']) / meta['res']; row = (meta['N1'] - EN[1]) / meta['res']
    v = ndi.map_coordinates(SLOPE, [row, col], order=1, mode='constant', cval=np.nan).reshape(xs.shape)
    return v
def ncc_shift(a, b, maxs):
    """find shift (dx,dy) of b relative to a maximizing NCC, |shift|<=maxs (pixels). returns dx,dy,score"""
    a = a - np.nanmean(a); b = b - np.nanmean(b)
    a = np.nan_to_num(a); b = np.nan_to_num(b)
    h, w = a.shape
    best = (-2, 0, 0)
    sa = a.std() + 1e-9
    # direct search with cv2.matchTemplate on cropped template
    m = maxs
    tpl = b[m:h - m, m:w - m]
    res = cv2.matchTemplate(a.astype(np.float32), tpl.astype(np.float32), cv2.TM_CCOEFF_NORMED)
    _, mxv, _, loc = cv2.minMaxLoc(res)
    return loc[0] - m, loc[1] - m, mxv, res
if __name__ == '__main__':
    base = Affine(json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', sys.argv[1])))['M'])
    D = black_density('a')
    out = []
    P = 260; MS = 90   # patch 520x520 map px ~ 1 km; search +-90 px (180 m)
    for y0 in range(450, 5000, 260):
        for x0 in range(100, 4000, 260):
            x1, y1 = x0 - MS, y0 - MS
            w = h = P + 2 * MS
            if x1 < 0 or y1 < 0 or x1 + w > D.shape[1] or y1 + h > D.shape[0]: continue
            dens = D[y1:y1 + h, x1:x1 + w]
            sl = sample_slope_into_map(base, x1 + MS, y0, P, P)       # slope under base transform for the central patch only
            # use template = slope patch (central), search in density window
            a = dens.astype(np.float32); tpl = sl.astype(np.float32)
            if np.isnan(tpl).mean() > 0.1 or tpl.std() < 1e-4: continue
            tpl = np.nan_to_num(tpl - np.nanmean(tpl))
            a = a - a.mean()
            res = cv2.matchTemplate(a, tpl, cv2.TM_CCOEFF_NORMED)
            _, mxv, _, loc = cv2.minMaxLoc(res)
            dx, dy = loc[0] - MS, loc[1] - MS          # map content is at +dx,+dy relative to where base predicts
            # peak sharpness: ratio to second peak away from the best by > 20 px
            r2 = res.copy(); cv2.circle(r2, loc, 25, -1, -1); _, sec, _, _ = cv2.minMaxLoc(r2)
            out.append(dict(x=x0 + P / 2, y=y0 + P / 2, dx=int(dx), dy=int(dy), score=round(float(mxv), 3), second=round(float(sec), 3)))
    json.dump(out, open(os.path.join(ROOT, 'tmp/b1863/roads/terreg_offsets.json'), 'w'))
    for o in out: print(o)
