"""ov2.py SHEET X0 Y0 W H SCALE OUT [nodes]: overlay + numbered junction nodes of named roads."""
import sys, os, json
from PIL import ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from overlay import *
from nodes import junctions
if __name__ == '__main__':
    a = sys.argv; s = a[1]; x0, y0, w, h = map(int, a[2:6]); sc = float(a[6]); out = a[7]
    af = load_tf(s)
    im = crop(s, x0, y0, w, h, sc, tick=50)
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    draw_vec(im, af, x0, y0, sc, t, (0, 90, 255), 1)
    dr = ImageDraw.Draw(im); f = ImageFont.truetype('arial.ttf', 11)
    k = 0
    for (lng, lat), names in junctions():
        px, py = af.ll2px(lng, lat)
        X, Y = (px - x0) * sc, (py - y0) * sc
        if 0 <= X < w * sc and 0 <= Y < h * sc and len(names) >= 2:
            k += 1; dr.ellipse([X - 4, Y - 4, X + 4, Y + 4], outline=(255, 0, 255)); dr.text((X + 5, Y - 5), f"{lng:.4f},{lat:.4f}", fill=(160, 0, 160), font=f)
    im.save(out)
