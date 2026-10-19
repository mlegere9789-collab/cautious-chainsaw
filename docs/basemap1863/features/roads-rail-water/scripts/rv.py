"""Road review tiles: catalogued 1863 roads (spec_roads) drawn thin on the Bachelder sheet."""
import sys, os, json
from PIL import ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from overlay import *
from geomlib import *
import spec_roads
def tiles(tf, outpref, x0s, y0s, w, h, sc, extra_names=False):
    af = Affine(json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', tf)))['M'])
    feats = json.load(open(os.path.join(OUT, 'roads.geojson')))
    nh = json.load(open(os.path.join(CACHE, 'nhd_6.geojson')))
    k = 0
    for r, y0 in enumerate(y0s):
        for c, x0 in enumerate(x0s):
            im = crop('a', x0, y0, w, h, sc, tick=100)
            draw_vec(im, af, x0, y0, sc, nh, (0, 200, 200), 1, only=lambda p: bool(p.get('gnis_name')))
            draw_vec(im, af, x0, y0, sc, feats, (0, 60, 255), 1)
            dr = ImageDraw.Draw(im); f = ImageFont.truetype('arial.ttf', 11)
            for ft in feats['features']:
                g = ft['geometry']; lines = [g['coordinates']] if g['type'] == 'LineString' else g['coordinates']
                best = None
                for ln in lines:
                    for q in ln:
                        px, py = af.ll2px(q[0], q[1]); X, Y = (px - x0) * sc, (py - y0) * sc
                        if 20 < X < w * sc - 80 and 20 < Y < h * sc - 20:
                            d = abs(X - w * sc / 2) + abs(Y - h * sc / 2)
                            if best is None or d < best[0]: best = (d, X, Y)
                if best: dr.text((best[1] + 4, best[2] - 13), ft['id'], fill=(255, 0, 0), font=f)
            im.save(f'{outpref}_{r}_{c}.png'); k += 1
    return k
if __name__ == '__main__':
    tf = sys.argv[1]
    print(tiles(tf, ROOT + '/tmp/b1863/roads/rv', [0, 1000, 2000, 3000], [430, 1330, 2230, 3130, 4030], 1100, 900, 1.15))
