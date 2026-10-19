"""python nodes_view.py E N half ppm out [scan] [gcps.json] : station view with candidate road-junction IDs on both panels.
Reading: for ID k, give dx,dy = display-px offset from the circle on the LEFT (scan) panel to the 1863 junction it corresponds to."""
import sys, os, json
from PIL import Image, ImageDraw
from common import *
from viewtools import *
from viewtools import _font
import georef
ec, nc, half, ppm = map(float, sys.argv[1:5]); out = sys.argv[5]
scan = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != '-' else 'cw0353500.jp2'
s = 1.027; en2px = lambda e, n: (4727 + (e - 308266) / s, 8691 - (n - 4406431) / s)
if len(sys.argv) > 7:
    d, px, en, g = georef.load_gcps(sys.argv[7]); kind = 'tps' if len(px) > 30 else ('poly2' if len(px) > 20 else 'affine')
    m = georef.Model(kind, 0.3 if kind == 'tps' else 0).fit(en, px); en2px = lambda e, n: tuple(m([[e, n]])[0])
os.environ['LEFTROADS'] = os.environ.get('LEFTROADS', '0')
station(os.path.join(TMP, 'scans', scan), en2px, ec, nc, half, out, ppm=ppm, mpp=s, gridm=100, tif=os.environ.get('TIF', 'naip_1m.tif'), roads=False)
J = json.load(open(out + '.json')); S = J['S']
im = Image.open(out); d = ImageDraw.Draw(im); f = _font(11)
nodes = [x for x in json.load(open(os.path.join(TMP, 'ref', 'road_nodes.json'))) if abs(x['e'] - ec) < half and abs(x['n'] - nc) < half]
placed = []; pred = {}
for x in nodes:
    px_, py_ = en2px(x['e'], x['n']); pred[x['id']] = [px_, py_]; lx = (px_ - J['scan_x0']) * J['sc']; ly = (py_ - J['scan_y0']) * J['sc']
    rx = S + 6 + (x['e'] - J['e0']) * J['ppm']; ry = (J['n_top'] - x['n']) * J['ppm']
    for (cx, cy) in ((lx, ly), (rx, ry)):
        d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], outline=(255, 0, 0), width=2)
        d.text((cx + 6, cy - 6), x['id'][1:], fill=(255, 255, 0) if cx > S else (200, 0, 0), font=f, stroke_width=1, stroke_fill=(0, 0, 0) if cx > S else (255, 255, 255))
im.save(out); json.dump(pred, open(out + '.pred.json', 'w'))
print(len(nodes), 'nodes')
