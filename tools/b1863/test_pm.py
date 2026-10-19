import sys, time, numpy as np, cv2
sys.path.insert(0, __import__('os').path.dirname(__file__))
import common as C, pminpaint as P
from PIL import Image
import rasterio
from rasterio.windows import Window
C.lowprio()
cx, cy, S = map(int, sys.argv[1:4])
r0, c0 = cy - S // 2, cx - S // 2
with rasterio.open(C.BASE_TIF) as d: img = np.moveaxis(d.read([1, 2, 3], window=Window(c0, r0, S, S)), 0, -1)
with rasterio.open(C.MASK_TIF) as d: m = d.read(1, window=Window(c0, r0, S, S))
tgt = np.isin(m, [1, 2, 3, 4, 6])
tgt = cv2.dilate(tgt.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
clear = ~cv2.dilate(tgt.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool) & ~np.isin(m, [5, 7])
t = time.time()
out = P.fill(img, tgt, clear)
print('time', time.time() - t, 'target px', tgt.sum())
ov = img.copy(); ov[tgt] = (0.5 * ov[tgt] + 0.5 * np.array([255, 0, 255])).astype(np.uint8)
vis = np.concatenate([img, ov, out], 1)
Image.fromarray(vis).save(sys.argv[4])
