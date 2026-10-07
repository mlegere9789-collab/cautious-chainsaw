"""Landmark crops for the check against the site's own coordinates: 120 m x 120 m of NAIP 2022 at 0.2 m/px centred on the site's coordinate, with a metre grid and a cross
at the site's coordinate (and a second mark for a second site value).  Output: tmp/look-dev/basemap/verify/lm_<id>.png (not committed: look at them).
Usage: python landmark-crops.py [id ...]"""
import json, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from common import *
from PIL import Image, ImageDraw
import numpy as np

NAIP = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage'
OUT = os.path.join(ROOT, 'tmp', 'look-dev', 'basemap', 'verify')
HALF = 60.0          # ground metres
PX = 0.2             # ground metres per pixel
lm = json.load(open(os.path.join(os.path.dirname(__file__), 'landmarks.json')))['landmarks']
want = set(sys.argv[1:])


def crop(lat, lng, name, half=HALF, px=PX):
    cx, cy = lnglat_to_merc(lng, lat)
    k = 1 / math.cos(math.radians(lat))
    hm = half * k
    n = int(round(2 * half / px))
    p = polite_get(NAIP, dict(bbox='%.4f,%.4f,%.4f,%.4f' % (cx - hm, cy - hm, cx + hm, cy + hm), bboxSR=3857, imageSR=3857, size=f'{n},{n}', format='png', pixelType='U8',
                              interpolation='RSP_BilinearInterpolation', renderingRule='{"rasterFunction":"None"}', f='image'), cache_key=f'verify/crop_{name}.png', min_interval=1.0)
    return Image.open(p).convert('RGB'), (cx, cy), n


def offset_px(site, ref, n, half=HALF, px=PX):
    """pixel position of `site` (lat, lng) inside a crop centred on `ref`"""
    k = 1 / math.cos(math.radians(ref[0]))
    x0, y0 = lnglat_to_merc(ref[1], ref[0])
    x1, y1 = lnglat_to_merc(site[1], site[0])
    return n / 2 + (x1 - x0) / k / px, n / 2 - (y1 - y0) / k / px


for L in lm:
    if want and L['id'] not in want:
        continue
    s = L['site']
    im, c, n = crop(s['lat'], s['lng'], L['id'])
    big = im.resize((n * 2, n * 2), Image.LANCZOS)                      # 2x for viewing
    d = ImageDraw.Draw(big)
    for m in range(-60, 61, 10):                                       # grid every 10 m (0.2 m/px -> 50 px per 10 m, 100 px at 2x)
        px_ = (n / 2 + m / PX) * 2
        col = (255, 255, 0) if m % 50 == 0 else (255, 255, 255)
        d.line([(px_, 0), (px_, n * 2)], fill=col + (90,), width=1 if m % 50 else 2)
        d.line([(0, px_), (n * 2, px_)], fill=col + (90,), width=1 if m % 50 else 2)
        if m != 0 and m % 20 == 0:
            d.text((px_ + 2, 2), f'{m:+d}E', fill=(255, 255, 0)); d.text((2, px_ + 2), f'{-m:+d}N', fill=(255, 255, 0))
    cx_, cy_ = n, n
    d.line([(cx_ - 14, cy_), (cx_ + 14, cy_)], fill=(255, 0, 0), width=2); d.line([(cx_, cy_ - 14), (cx_, cy_ + 14)], fill=(255, 0, 0), width=2)
    if 'site2' in L:
        x2, y2 = offset_px((L['site2']['lat'], L['site2']['lng']), (s['lat'], s['lng']), n)
        d.ellipse([x2 * 2 - 8, y2 * 2 - 8, x2 * 2 + 8, y2 * 2 + 8], outline=(0, 255, 255), width=2)
    big.save(os.path.join(OUT, f'lm_{L["id"]}.png'))
    print('wrote', L['id'], big.size)
