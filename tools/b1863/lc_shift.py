"""Measure the local offset between the Warren-derived 1863 woods (lc == 2) and the persistent modern canopy (2017 lidar), per 2 km window.
Normalised cross-correlation on the 2 m canopy grid, shifts within +-90 m. Output tmp/b1863/build/lc_shift.json + prints a table.
Purpose: decide how large a tolerance the change decisions need and whether the polygons carry a smooth registration error (reported in BUILD.md)."""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import rasterio
from rasterio.windows import Window
from scipy.signal import fftconvolve

canopy2 = np.load(os.path.join(C.ROOT, 'tmp', 'b1863', 'landcover', 'canopy_smooth.npy')).astype(np.float32)
r_off, c_off = 460, 3780
h2, w2 = canopy2.shape
with rasterio.open(os.path.join(C.BUILD, 'lc1863.tif')) as d:
    lc = d.read(1, window=Window(c_off, r_off, w2 * 2, h2 * 2))
woods = ((lc == 2) | (lc == 3)).astype(np.float32)
woods2 = woods.reshape(h2, 2, w2, 2).mean((1, 3))
S = 500       # window 1000 m
MAXS = 45     # +-90 m
res = []
for r in range(0, h2 - S, S // 2):
    for c in range(0, w2 - S, S // 2):
        w = woods2[r:r + S, c:c + S]; k = canopy2[r:r + S, c:c + S]
        if w.mean() < 0.06 or w.mean() > 0.9 or k.mean() < 0.06:
            continue
        w0 = w - w.mean(); k0 = k - k.mean()
        # correlation of the central part of w against shifted k
        core = w0[MAXS:-MAXS, MAXS:-MAXS]
        cc = cv2.matchTemplate(k0, core, cv2.TM_CCOEFF_NORMED)
        pk = np.unravel_index(np.argmax(cc), cc.shape)
        dy = (pk[0] - MAXS) * 2.0; dx = (pk[1] - MAXS) * 2.0       # canopy is displaced by (dx east, dy south) from the polygons
        zero = cc[MAXS, MAXS]
        res.append(dict(r=r, c=c, x=C.X0 + c_off + (c + S / 2) * 2, y=C.Y0 - r_off - (r + S / 2) * 2, dx_east_m=dx, dy_south_m=dy, peak=float(cc.max()), zero_shift_corr=float(zero), woods_frac=float(w.mean())))
for q in res:
    print('x %.0f y %.0f  canopy-vs-polygon shift east %+5.0f south %+5.0f  corr %.2f (at zero %.2f) woods %.2f' % (q['x'], q['y'], q['dx_east_m'], q['dy_south_m'], q['peak'], q['zero_shift_corr'], q['woods_frac']))
a = np.array([[q['dx_east_m'], q['dy_south_m']] for q in res])
print('n', len(res), 'median shift', np.median(a, 0), 'median |shift|', np.median(np.hypot(*a.T)), 'p90', np.percentile(np.hypot(*a.T), 90))
json.dump(res, open(os.path.join(C.BUILD, 'lc_shift.json'), 'w'), indent=1)
