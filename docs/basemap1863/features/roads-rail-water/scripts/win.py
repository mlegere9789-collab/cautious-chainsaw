"""win.py SHEET TF LNG LAT [HALF] [SC] OUT : map-only crop around the predicted pixel of (lng,lat), crosshair at prediction."""
import sys, os, json
from PIL import ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
from overlay import *
if __name__ == '__main__':
    s, tf, lng, lat = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
    half = int(sys.argv[5]) if len(sys.argv) > 5 else 140; sc = float(sys.argv[6]) if len(sys.argv) > 6 else 2.6; out = sys.argv[7] if len(sys.argv) > 7 else ROOT + '/tmp/b1863/roads/win.png'
    af = Affine(json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', tf)))['M'])
    px, py = af.ll2px(lng, lat); x0, y0 = int(px - half), int(py - half)
    im = crop(s, x0, y0, 2 * half, 2 * half, sc, tick=20 if half <= 100 else 50)
    dr = ImageDraw.Draw(im); X, Y = (px - x0) * sc, (py - y0) * sc
    dr.line([(X - 10, Y), (X + 10, Y)], fill=(255, 0, 255)); dr.line([(X, Y - 10), (X, Y + 10)], fill=(255, 0, 255))
    im.save(out)
