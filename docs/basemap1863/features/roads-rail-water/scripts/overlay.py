"""overlay.py SHEET X0 Y0 W H SCALE OUT : crop with TIGER roads from the current transform (transform file tmp/b1863/roads/gcps_<sheet>.json or initial guess)."""
import sys, os, json
from PIL import ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
from crop import *
from georef import *
INIT = {'a': (2502, 2000), 'c': (2503, 2143)}
def load_tf(s):
    p = os.path.join(ROOT, 'tmp/b1863/roads', f'tf_{s}.json')
    if os.path.exists(p): return Affine(json.load(open(p))['M'])
    return initial(INIT.get(s, (2500, 2143)))
def draw_vec(im, af, x0, y0, sc, gj, col, lw=1, only=None):
    dr = ImageDraw.Draw(im)
    for f in gj['features']:
        if only and not only(f['properties']): continue
        g = f['geometry']; lines = [g['coordinates']] if g['type'] == 'LineString' else (g['coordinates'] if g['type'] == 'MultiLineString' else [])
        for ln in lines:
            pts = [((af.ll2px(c[0], c[1])[0] - x0) * sc, (af.ll2px(c[0], c[1])[1] - y0) * sc) for c in ln]
            dr.line(pts, fill=col, width=lw)
if __name__ == '__main__':
    a = sys.argv; s = a[1]; x0, y0, w, h = map(int, a[2:6]); sc = float(a[6]); out = a[7]
    af = load_tf(s)
    im = crop(s, x0, y0, w, h, sc, tick=100)
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    draw_vec(im, af, x0, y0, sc, t, (0, 90, 255), 1)
    im.save(out)
