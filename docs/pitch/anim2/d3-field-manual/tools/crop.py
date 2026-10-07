"""tools/crop.py - crop a region (CSS px) out of a DPR-N screenshot at 100 percent: python tools/crop.py in.png out.png x y w h [dpr=2]"""
import sys
from PIL import Image
a = sys.argv
src, dst, x, y, w, h = a[1], a[2], *map(float, a[3:7]); dpr = float(a[7]) if len(a) > 7 else 2.0
im = Image.open(src).convert('RGB'); box = tuple(int(round(v * dpr)) for v in (x, y, x + w, y + h)); im.crop(box).save(dst); print(dst, im.size, box)
