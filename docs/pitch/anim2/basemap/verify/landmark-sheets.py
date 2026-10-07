"""Measurement sheets for the landmark check.  For every landmark in landmarks.json: a 40 m x 40 m window of NAIP 2022 (USGS service, 0.2 m/px crop, cached by landmark-crops.py)
centred on the coordinate, upscaled to 15 px per metre (600 x 600), with a 5 m grid (10 m heavier), the coordinate as a red cross and, when it falls inside the window,
the second source value as a cyan ring.  Four sheets per picture (2 x 2), numbered; the landmark is read by eye on these and the readings are written to landmark-readings.json.
Usage: python landmark-sheets.py   -> tmp/look-dev/basemap/verify/sheet_<k>.png (and a JPEG copy under ../previews/landmarks/)"""
import json, math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from common import *
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'tmp', 'look-dev', 'basemap', 'verify')
PUB = os.path.join(BASEMAP, 'previews', 'landmarks')
os.makedirs(PUB, exist_ok=True)
NAIP = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage'
PX, HALF = 0.2, 60.0           # crop: 0.2 m/px, 120 m window (the cache key crop_<id>.png of landmark-crops.py)
WIN, SCALE = 40.0, 15          # sheet window in metres, px per metre
lm = json.load(open(os.path.join(HERE, 'landmarks.json'), encoding='utf8'))['landmarks']


def crop(L):
    s = L['site']; cx, cy = lnglat_to_merc(s['lng'], s['lat']); k = 1 / math.cos(math.radians(s['lat'])); hm = HALF * k; n = int(round(2 * HALF / PX))
    p = polite_get(NAIP, dict(bbox='%.4f,%.4f,%.4f,%.4f' % (cx - hm, cy - hm, cx + hm, cy + hm), bboxSR=3857, imageSR=3857, size=f'{n},{n}', format='png', pixelType='U8',
                              interpolation='RSP_BilinearInterpolation', renderingRule='{"rasterFunction":"None"}', f='image'), cache_key=f'verify/crop_{L["id"]}.png', min_interval=1.0)
    return Image.open(p).convert('RGB'), n


def metres_from(a, b):
    """east, north ground metres of point b (lat, lng) from point a"""
    ax, ay = lnglat_to_merc(a[1], a[0]); bx, by = lnglat_to_merc(b[1], b[0]); k = math.cos(math.radians(a[0]))
    return (bx - ax) * k, (by - ay) * k


def panel(L):
    im, n = crop(L)
    half_px = int(WIN / 2 / PX)
    c = im.crop((n // 2 - half_px, n // 2 - half_px, n // 2 + half_px, n // 2 + half_px)).resize((int(WIN * SCALE),) * 2, Image.LANCZOS)
    d = ImageDraw.Draw(c); W = c.size[0]
    for m in range(-20, 21, 5):
        x = W / 2 + m * SCALE; col = (255, 255, 0) if m % 10 == 0 else (255, 255, 255); w = 2 if m % 10 == 0 else 1
        d.line([(x, 0), (x, W)], fill=col, width=w); d.line([(0, x), (W, x)], fill=col, width=w)
        if m % 10 == 0 and m != 0: d.text((x + 3, 3), f'{m:+d}E', fill=(255, 255, 0)); d.text((3, W / 2 - m * SCALE + 3), f'{m:+d}N', fill=(255, 255, 0))
    d.line([(W / 2 - 16, W / 2), (W / 2 + 16, W / 2)], fill=(255, 0, 0), width=3); d.line([(W / 2, W / 2 - 16), (W / 2, W / 2 + 16)], fill=(255, 0, 0), width=3)
    if 'site2' in L:
        e, nn = metres_from((L['site']['lat'], L['site']['lng']), (L['site2']['lat'], L['site2']['lng']))
        if abs(e) < WIN / 2 and abs(nn) < WIN / 2:
            x, y = W / 2 + e * SCALE, W / 2 - nn * SCALE; d.ellipse([x - 9, y - 9, x + 9, y + 9], outline=(0, 255, 255), width=3)
    d.rectangle([0, 0, 250, 18], fill=(0, 0, 0)); d.text((4, 3), L['id'], fill=(255, 255, 255))
    return c


ids = [L['id'] for L in lm]
for k in range(0, len(lm), 4):
    sheet = Image.new('RGB', (1200, 1200), (0, 0, 0))
    for j, L in enumerate(lm[k:k + 4]):
        sheet.paste(panel(L), ((j % 2) * 600, (j // 2) * 600))
    sheet.save(os.path.join(OUT, f'sheet_{k // 4}.png'))
    sheet.save(os.path.join(PUB, f'sheet_{k // 4}.jpg'), quality=88)
    print('sheet', k // 4, [L['id'] for L in lm[k:k + 4]])
