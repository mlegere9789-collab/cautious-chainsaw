import sys, os, json
from PIL import ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from overlay import *
def tile(s, af, x0, y0, w, h, sc, out, extra=None, names=True):
    im = crop(s, x0, y0, w, h, sc, tick=100)
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    nh = json.load(open(os.path.join(CACHE, 'nhd_6.geojson')))
    draw_vec(im, af, x0, y0, sc, nh, (0, 190, 190), 1, only=lambda p: bool(p.get('gnis_name')))
    def cat(p):
        n = p['name'] or ''
        if p['mtfcc'] in ('S1100',): return 'bypass'
        if n.endswith(' Ave') and n not in ('Steinwehr Ave', 'Buford Ave', 'Lincoln Ave', 'Springs Ave') or 'Confederate' in n or n.endswith(' Dr') or n.endswith(' Ct') or n.endswith(' Cir') or n.endswith(' Trl') or n.endswith(' Way'): return 'modern'
        return 'hist'
    draw_vec(im, af, x0, y0, sc, t, (150, 150, 150), 1, only=lambda p: cat(p) == 'bypass')
    draw_vec(im, af, x0, y0, sc, t, (230, 40, 40), 1, only=lambda p: cat(p) == 'modern')
    draw_vec(im, af, x0, y0, sc, t, (0, 70, 255), 1, only=lambda p: cat(p) == 'hist')
    if extra:
        for gj, col, lw in extra: draw_vec(im, af, x0, y0, sc, gj, col, lw)
    dr = ImageDraw.Draw(im); f = ImageFont.truetype('arial.ttf', 11)
    if names:
        for ft in t['features']:
            nm = ft['properties']['name']
            if not nm or ft['properties']['mtfcc'] not in ('S1200', 'S1400'): continue
            c = ft['geometry']['coordinates']
            # label at the vertex nearest tile centre
            best = None
            for q in c:
                px, py = af.ll2px(q[0], q[1]); X, Y = (px - x0) * sc, (py - y0) * sc
                if 15 < X < w * sc - 60 and 15 < Y < h * sc - 15:
                    d = abs(X - w * sc / 2) + abs(Y - h * sc / 2)
                    if best is None or d < best[0]: best = (d, X, Y)
            if best: dr.text((best[1] + 3, best[2] - 12), nm, fill=(0, 0, 160), font=f)
    im.save(out)
if __name__ == '__main__':
    s = sys.argv[1]; tf = sys.argv[2]; x0, y0, w, h = map(int, sys.argv[3:7]); sc = float(sys.argv[7]); out = sys.argv[8]
    af = Affine(json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', tf)))['M'])
    tile(s, af, x0, y0, w, h, sc, out)
