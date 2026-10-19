"""Colour the provenance classes over the final image: python viewprov.py <hotspot|col,row> <size> <out.png> [scale]  (left: final image, right: provenance colours blended)"""
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from s40_tiles import PALETTE
from PIL import Image
where, size, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1
if where in C.HOTSPOTS:
    x, y = C.ll2utm(*C.HOTSPOTS[where]); cx, cy = C.utm2px(x, y)
else:
    cx, cy = map(float, where.split(','))
c0 = min(max(int(cx - size // 2), 0), C.W - size); r0 = min(max(int(cy - size // 2), 0), C.H - size)
F = np.memmap(os.environ.get('B1863_FINAL', os.path.join(C.BUILD, 'stage35.u8')), dtype=np.uint8, mode='r', shape=(C.H, C.W, 3))
P = np.memmap(os.path.join(C.BUILD, 'prov.u8'), dtype=np.uint8, mode='r', shape=(C.H, C.W))
img = np.array(F[r0:r0 + size, c0:c0 + size]); p = np.array(P[r0:r0 + size, c0:c0 + size])
col = np.zeros_like(img)
for k, v in PALETTE.items():
    col[p == k] = v
ov = (img * 0.55 + col * 0.45).astype(np.uint8)
ov[p == 0] = img[p == 0]
a = np.concatenate([img, ov], 1)
im = Image.fromarray(a)
if scale != 1: im = im.resize((int(a.shape[1] * scale), int(a.shape[0] * scale)), Image.BICUBIC)
im.save(out)
