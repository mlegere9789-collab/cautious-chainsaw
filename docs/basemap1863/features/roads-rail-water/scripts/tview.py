"""tview.py OUT x0 y0 w h [scale] [tick]: plain gridded crop of sheet a (no overlay) + optional traced lines from traces_a.json (cyan)."""
import sys, os, json
from PIL import ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from crop import *
if __name__ == '__main__':
    out = sys.argv[1]; x0, y0, w, h = map(int, sys.argv[2:6]); sc = float(sys.argv[6]) if len(sys.argv) > 6 else 2.0; tick = int(sys.argv[7]) if len(sys.argv) > 7 else 20
    im = crop('a', x0, y0, w, h, sc, tick=tick)
    p = os.path.join(OUT, 'traces_a.json')
    if os.path.exists(p) and os.environ.get('TR', '1') == '1':
        dr = ImageDraw.Draw(im); f = ImageFont.truetype('arial.ttf', 11)
        for k, t in json.load(open(p))['traces'].items():
            pts = [((x - x0) * sc, (y - y0) * sc) for x, y in t['px']]
            dr.line(pts, fill=(0, 200, 230), width=2)
            for q in pts: dr.ellipse([q[0] - 2, q[1] - 2, q[0] + 2, q[1] + 2], outline=(0, 120, 255))
            dr.text((pts[0][0] + 4, pts[0][1] + 2), k, fill=(0, 100, 200), font=f)
    im.save(out)
