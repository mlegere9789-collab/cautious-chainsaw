"""Make PNG crops of a raster (RGB) around a hotspot or window for visual review: python view.py <tif> <name|col,row> <size_px> <out.png> [scale]"""
import sys, numpy as np
sys.path.insert(0, __import__('os').path.dirname(__file__))
import common as C
from PIL import Image
def crop(path, cx, cy, size, bands=(1, 2, 3)):
    import rasterio
    from rasterio.windows import Window
    c0 = int(cx - size // 2); r0 = int(cy - size // 2)
    with rasterio.open(path) as ds:
        a = ds.read(list(bands), window=Window(c0, r0, size, size), boundless=True, fill_value=0)
    return np.moveaxis(a, 0, -1), (r0, c0)
if __name__ == '__main__':
    path, where, size, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    scale = float(sys.argv[5]) if len(sys.argv) > 5 else 1
    if where in C.HOTSPOTS:
        x, y = C.ll2utm(*C.HOTSPOTS[where]); cx, cy = C.utm2px(x, y)
    else:
        cx, cy = map(float, where.split(','))
    a, _ = crop(path, cx, cy, size)
    im = Image.fromarray(a.astype(np.uint8))
    if scale != 1: im = im.resize((int(size * scale),) * 2, Image.BICUBIC)
    im.save(out)
