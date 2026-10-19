"""Crop a raw H x W x 3 uint8 memmap of the build grid to a PNG: python viewraw.py <file.u8|tif> <hotspot|col,row> <size> <out.png> [scale] [side-by-side with base: sbs]"""
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from PIL import Image

def get(path, cx, cy, size):
    c0 = int(cx - size // 2); r0 = int(cy - size // 2)
    c0 = min(max(c0, 0), C.W - size); r0 = min(max(r0, 0), C.H - size)
    if path.endswith('.u8'):
        mm = np.memmap(path, dtype=np.uint8, mode='r', shape=(C.H, C.W, 3))
        return np.array(mm[r0:r0 + size, c0:c0 + size])
    import rasterio
    from rasterio.windows import Window
    with rasterio.open(path) as d:
        return np.moveaxis(d.read([1, 2, 3], window=Window(c0, r0, size, size)), 0, -1)

if __name__ == '__main__':
    path, where, size, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    scale = float(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] != 'sbs' else 1
    sbs = 'sbs' in sys.argv[5:]
    if where in C.HOTSPOTS:
        x, y = C.ll2utm(*C.HOTSPOTS[where]); cx, cy = C.utm2px(x, y)
    else:
        cx, cy = map(float, where.split(','))
    a = get(path, cx, cy, size)
    if sbs:
        a = np.concatenate([get(C.BASE_TIF, cx, cy, size), a], 1)
    im = Image.fromarray(a)
    if scale != 1: im = im.resize((int(a.shape[1] * scale), int(a.shape[0] * scale)), Image.BICUBIC)
    im.save(out)
