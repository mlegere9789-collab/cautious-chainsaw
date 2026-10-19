"""crop.py SHEET X0 Y0 W H [SCALE] [OUT] : crop of a Bachelder sheet 50% image (pixel coords of that image) with labelled ticks."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS = None
sys.path.insert(0, os.path.dirname(__file__))
from common import *
MAPS = os.path.join(ROOT, 'tmp', 'b1863', 'roads', 'maps')
_cache = {}
def sheet(s):
    if s not in _cache: _cache[s] = Image.open(os.path.join(MAPS, f'bach1879_{s}.50.jpg')).convert('RGB')
    return _cache[s]
def crop(s, x0, y0, w, h, scale=1.0, tick=100, overlay=None):
    im = sheet(s).crop((x0, y0, x0 + w, y0 + h))
    if scale != 1: im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    dr = ImageDraw.Draw(im)
    try: f = ImageFont.truetype('arial.ttf', 12)
    except: f = ImageFont.load_default()
    for X in range((x0 // tick + 1) * tick, x0 + w, tick):
        px = (X - x0) * scale; dr.line([(px, 0), (px, 14)], fill=(255, 0, 0), width=1); dr.line([(px, 0), (px, h*scale)], fill=(255, 0, 0, 60) if False else (255, 160, 160), width=1)
        dr.text((px + 2, 0), str(X), fill=(200, 0, 0), font=f)
    for Y in range((y0 // tick + 1) * tick, y0 + h, tick):
        py = (Y - y0) * scale; dr.line([(0, py), (14, py)], fill=(255, 0, 0), width=1); dr.line([(0, py), (w*scale, py)], fill=(255, 160, 160), width=1)
        dr.text((2, py + 1), str(Y), fill=(200, 0, 0), font=f)
    return im
if __name__ == '__main__':
    a = sys.argv
    s, x0, y0, w, h = a[1], int(a[2]), int(a[3]), int(a[4]), int(a[5])
    sc = float(a[6]) if len(a) > 6 else 1.0
    out = a[7] if len(a) > 7 else os.path.join(ROOT, 'tmp/b1863/roads/crop.png')
    crop(s, x0, y0, w, h, sc).save(out)
