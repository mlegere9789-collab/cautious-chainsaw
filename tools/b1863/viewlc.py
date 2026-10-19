"""Overlay of the land-cover decisions on an image: python viewlc.py <image.u8|tif> <hotspot|col,row> <size> <out.png> [scale]
red = modern canopy to remove, green = 1863 woods to add, yellow = 1863 orchard to add, cyan outline = 1863 woods, magenta outline = orchards, blue = wheat"""
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C, viewraw as V
import rasterio
from rasterio.windows import Window
from PIL import Image
path, where, size, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
scale = float(sys.argv[5]) if len(sys.argv) > 5 else 1
if where in C.HOTSPOTS:
    x, y = C.ll2utm(*C.HOTSPOTS[where]); cx, cy = C.utm2px(x, y)
else:
    cx, cy = map(float, where.split(','))
c0 = min(max(int(cx - size // 2), 0), C.W - size); r0 = min(max(int(cy - size // 2), 0), C.H - size)
img = V.get(path, cx, cy, size).copy()
def rd(n):
    with rasterio.open(os.path.join(C.BUILD, n + '.tif')) as d:
        return d.read(1, window=Window(c0, r0, size, size))
lc = rd('lc1863'); rem = rd('chg_remove'); add = rd('chg_add')
ov = img.astype(np.float32)
def tint(m, col, a=0.4):
    ov[m] = ov[m] * (1 - a) + np.array(col) * a
tint(rem == 1, (255, 0, 0)); tint(add == 1, (0, 255, 0)); tint(add == 2, (255, 255, 0)); tint(lc == 4, (0, 0, 255))
ov = ov.astype(np.uint8)
for v, col in ((2, (0, 255, 255)), (3, (255, 0, 255))):
    cs, _ = cv2.findContours((lc == v).astype(np.uint8), cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(ov, cs, -1, col, 1)
a = np.concatenate([img, ov], 1)
im = Image.fromarray(a)
if scale != 1: im = im.resize((int(a.shape[1] * scale), int(a.shape[0] * scale)), Image.BICUBIC)
im.save(out)
