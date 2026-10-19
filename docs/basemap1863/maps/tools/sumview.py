"""station view (scan | DEM contours) with summit candidate ids on the right panel.  python sumview.py E N half ppm out [gcps]"""
import sys, os, json
from PIL import Image, ImageDraw
from common import *
from viewtools import *
from viewtools import _font
import georef
ec, nc, half, ppm = map(float, sys.argv[1:5]); out = sys.argv[5]
d, px, en, g = georef.load_gcps(sys.argv[6]); kind = 'tps' if len(px) > 30 else ('poly2' if len(px) > 20 else 'affine')
m = georef.Model(kind, 0.3 if kind == 'tps' else 0).fit(en, px); en2px = lambda e, n: tuple(m([[e, n]])[0])
os.environ['LEFTROADS'] = '0'
station(os.path.join(TMP, 'scans', 'cw0353500.jp2'), en2px, ec, nc, half, out, ppm=ppm, mpp=1.027, gridm=100, tif='ct_1m.tif', roads=False)
J = json.load(open(out + '.json')); S = J['S']; im = Image.open(out); dr = ImageDraw.Draw(im); f = _font(12)
for s in json.load(open(os.path.join(TMP, 'ref', 'summit_cands.json'))):
    if abs(s['e'] - ec) < half and abs(s['n'] - nc) < half:
        rx = S + 6 + (s['e'] - J['e0']) * ppm; ry = (J['n_top'] - s['n']) * ppm
        dr.ellipse([rx - 4, ry - 4, rx + 4, ry + 4], outline=(255, 0, 0), width=2); dr.text((rx + 6, ry - 6), s['id'][1:] + ' z%d' % s['z'], fill=(200, 0, 0), font=f)
im.save(out)
