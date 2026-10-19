import json, os, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from common import *
def render(layers, bbox, width, out, labels=True, grid=True):
    """layers: list of (geojson dict, color, lw, labelkey or None)"""
    x0, y0 = ll2m(bbox[0], bbox[1]); x1, y1 = ll2m(bbox[2], bbox[3])
    sc = width / (x1 - x0); h = int((y1 - y0) * sc)
    im = Image.new('RGB', (width, h), (245, 240, 225)); dr = ImageDraw.Draw(im)
    try: f = ImageFont.truetype('arial.ttf', 11)
    except: f = ImageFont.load_default()
    def px(lng, lat):
        x, y = ll2m(lng, lat); return ((x - x0) * sc, h - (y - y0) * sc)
    if grid:
        gx = 1000
        import math
        for k in range(int(math.ceil(x0 / gx)), int(x1 / gx) + 1):
            X = (k * gx - x0) * sc; dr.line([(X, 0), (X, h)], fill=(220, 220, 230))
        for k in range(int(math.ceil(y0 / gx)), int(y1 / gx) + 1):
            Y = h - (k * gx - y0) * sc; dr.line([(0, Y), (width, Y)], fill=(220, 220, 230))
    for gj, col, lw, lk in layers:
        for ft in gj['features']:
            g = ft['geometry']
            lines = [g['coordinates']] if g['type'] == 'LineString' else (g['coordinates'] if g['type'] == 'MultiLineString' else [])
            for ln in lines:
                pts = [px(*c[:2]) for c in ln]
                if len(pts) > 1: dr.line(pts, fill=col, width=lw)
            if labels and lk and lines and ft['properties'].get(lk):
                ln = lines[0]; mid = px(*ln[len(ln) // 2][:2])
                if 0 < mid[0] < width and 0 < mid[1] < h: dr.text(mid, ft['properties'][lk], fill=(0, 0, 0), font=f)
    im.save(out); return im
if __name__ == '__main__':
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    maj = {'features': [f for f in t['features'] if f['properties']['mtfcc'] in ('S1100', 'S1200')]}
    mnr = {'features': [f for f in t['features'] if f['properties']['mtfcc'] not in ('S1100', 'S1200')]}
    bb = [-77.285, 39.78, -77.19, 39.845]
    render([(mnr, (150, 150, 150), 1, None), (maj, (200, 40, 40), 2, 'name')], bb, 1800, os.path.join(ROOT, 'tmp/b1863/roads/tiger_overview.png'))
