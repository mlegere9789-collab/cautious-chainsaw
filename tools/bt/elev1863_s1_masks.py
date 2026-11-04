"""Stage 1: ink / thick / thin masks for the whole Warren scan (tiled, memory-mapped in tmp/bt/elev1863).
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s1_masks.py
"""
import os
import sys
import time
import json
import numpy as np
import cv2
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import elev1863_vec as V

T, M = 1800, 80
g = cv2.imread(C.SCAN_GRAY, 0)
assert g.shape == (C.H, C.W)
ink = np.lib.format.open_memmap(os.path.join(C.CACHE, 'ink.npy'), 'w+', np.uint8, (C.H, C.W))
thin = np.lib.format.open_memmap(os.path.join(C.CACHE, 'thin.npy'), 'w+', np.uint8, (C.H, C.W))
thick = np.lib.format.open_memmap(os.path.join(C.CACHE, 'thickd.npy'), 'w+', np.uint8, (C.H, C.W))
t0 = time.time()
tot = {'lines': 0}
for y0 in range(0, C.H, T):
    for x0 in range(0, C.W, T):
        ya, yb = max(0, y0 - M), min(C.H, y0 + T + M)
        xa, xb = max(0, x0 - M), min(C.W, x0 + T + M)
        tile = g[ya:yb, xa:xb]
        k = V.ink_mask(tile)
        th, td, nl = V.remove_thick_and_lines(k)
        tot['lines'] += nl
        cy0, cy1 = y0 - ya, min(T, C.H - y0) + (y0 - ya)
        cx0, cx1 = x0 - xa, min(T, C.W - x0) + (x0 - xa)
        ink[y0:y0 + (cy1 - cy0), x0:x0 + (cx1 - cx0)] = k[cy0:cy1, cx0:cx1]
        thin[y0:y0 + (cy1 - cy0), x0:x0 + (cx1 - cx0)] = th[cy0:cy1, cx0:cx1]
        thick[y0:y0 + (cy1 - cy0), x0:x0 + (cx1 - cx0)] = td[cy0:cy1, cx0:cx1]
    print('row', y0, round(time.time() - t0), 's', flush=True)
ink.flush()
thin.flush()
thick.flush()
json.dump({'tile': T, 'margin': M, 'hough_lines': tot['lines'], 'ink_frac': float(ink[::4, ::4].mean()),
           'thin_frac': float(thin[::4, ::4].mean()), 'thick_frac': float(thick[::4, ::4].mean())},
          open(os.path.join(C.CACHE, 's1_stats.json'), 'w'))
print('done', time.time() - t0)
