"""gcpsheet.py SHEET OUT name:lng:lat ... : panels (2x2) with predicted marker (magenta) and 20px ticks; also draws TIGER overlay lightly."""
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from overlay import *
def panel(s, af, name, lng, lat, half=(60, 45), sc=3.2, tiger=None, tick=10):
    px, py = af.ll2px(lng, lat)
    x0, y0 = int(px - half[0]), int(py - half[1]); w, h = half[0] * 2, half[1] * 2
    im = crop(s, x0, y0, w, h, sc, tick=tick)
    if tiger:
        draw_vec(im, af, x0, y0, sc, tiger, (0, 90, 255), 1)
        nh = json.load(open(os.path.join(CACHE, 'nhd_6.geojson')))
        draw_vec(im, af, x0, y0, sc, nh, (0, 200, 200), 1, only=lambda p: bool(p.get('gnis_name')))
    dr = ImageDraw.Draw(im); f = ImageFont.truetype('arial.ttf', 13)
    X, Y = (px - x0) * sc, (py - y0) * sc
    dr.line([(X - 8, Y), (X + 8, Y)], fill=(255, 0, 255), width=1); dr.line([(X, Y - 8), (X, Y + 8)], fill=(255, 0, 255), width=1)
    dr.rectangle([0, h * sc - 16, 330, h * sc], fill=(255, 255, 255)); dr.text((3, h * sc - 15), f"{name} pred=({px:.0f},{py:.0f})", fill=(0, 0, 0), font=f)
    return im
if __name__ == '__main__':
    s, out = sys.argv[1], sys.argv[2]
    items = [a.split(':') for a in sys.argv[3:]]
    af = load_tf(s)
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    import os
    HALF = int(os.environ.get('HALF', 60)); SC = float(os.environ.get('SC', 3.2)); TK = int(os.environ.get('TK', 10)); TG = os.environ.get('TIGER', '1') == '1'
    ps = [panel(s, af, n, float(a), float(b), half=(HALF, HALF), sc=SC, tiger=(t if TG else None), tick=TK) for n, a, b in items]
    W = ps[0].width; H = ps[0].height
    cols = 3; rows = (len(ps) + 2) // 3
    sheet = Image.new('RGB', (W * cols, H * rows), (255, 255, 255))
    for i, p in enumerate(ps): sheet.paste(p, ((i % cols) * W, (i // cols) * H))
    sheet.save(out)
