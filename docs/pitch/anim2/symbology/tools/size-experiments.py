"""Atlas byte-size experiments (build time, read-only on dist/): what could ship instead of the 32-bit PNG atlases, and at what pixel cost.
   python tools/size-experiments.py            writes results/size-experiments.json and prints a table

For every atlas (nato, shield, minimal, overlays) at 1x, 2x and 3x it measures
  png        the shipped file (bytes)
  pngOpt     the same pixels re-encoded by Pillow with optimize=True
  pngPal     an 8-bit palette PNG (Pillow FASTOCTREE quantisation, no dither): bytes and the error it costs
  webpLoss   WebP lossless: bytes (identical pixels)
  webp90     WebP lossy quality 90 with alpha: bytes and the error it costs
The error is measured against the shipped atlas on the pixels that matter: weighted by alpha, as the largest per-channel difference over the premultiplied colour (0..255) and the mean over the pixels whose alpha > 0.
Nothing here ships: the shipped atlas stays the lossless PNG; the table is the evidence for the recommendation in the README."""
import io, json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist = os.path.join(ROOT, 'dist', 'atlas')
rows = []

def size(buf):
    return len(buf.getvalue())

def err(a, b):
    """max and mean premultiplied per-channel difference between two RGBA arrays (0..255)"""
    fa = a.astype(np.float32); fb = b.astype(np.float32)
    pa = fa[..., :3] * fa[..., 3:4] / 255.0; pb = fb[..., :3] * fb[..., 3:4] / 255.0
    d = np.abs(pa - pb).max(axis=2); da = np.abs(fa[..., 3] - fb[..., 3])
    vis = (fa[..., 3] > 0) | (fb[..., 3] > 0)
    return {'maxColour': round(float(d.max()), 1), 'meanColour': round(float(d[vis].mean()), 3), 'maxAlpha': round(float(da.max()), 1), 'meanAlpha': round(float(da[vis].mean()), 3)}

for name in ['nato', 'shield', 'minimal', 'overlays']:
    idx = json.load(open(os.path.join(dist, name + '.json'), encoding='utf8'))
    for sc in idx['scales']:
        f = os.path.join(dist, idx['files'][str(sc)]); raw = os.path.getsize(f)
        im = Image.open(f).convert('RGBA'); a = np.array(im)
        row = {'atlas': name, 'scale': sc, 'w': im.width, 'h': im.height, 'png': raw}
        b = io.BytesIO(); im.save(b, 'PNG', optimize=True); row['pngOpt'] = size(b)
        q = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE); b = io.BytesIO(); q.save(b, 'PNG', optimize=True); row['pngPal'] = size(b); row['pngPalError'] = err(a, np.array(q.convert('RGBA')))
        b = io.BytesIO(); im.save(b, 'WEBP', lossless=True, quality=100, method=6); row['webpLoss'] = size(b); row['webpLossError'] = err(a, np.array(Image.open(io.BytesIO(b.getvalue())).convert('RGBA')))
        b = io.BytesIO(); im.save(b, 'WEBP', quality=90, method=6); row['webp90'] = size(b); row['webp90Error'] = err(a, np.array(Image.open(io.BytesIO(b.getvalue())).convert('RGBA')))
        rows.append(row)

def tot(sc, key, langs=('nato', 'shield', 'minimal')):
    return sum(r[key] for r in rows if r['scale'] == sc and r['atlas'] in langs)

# what one skin loads: one language atlas plus the overlays atlas at the device's scale
per_skin = {}
for lang in ['nato', 'shield', 'minimal']:
    per_skin[lang] = {}
    for sc in (1, 2, 3):
        o = {k: sum(r[k] for r in rows if r['scale'] == sc and r['atlas'] in (lang, 'overlays')) for k in ('png', 'pngOpt', 'pngPal', 'webpLoss', 'webp90')}
        per_skin[lang][f'{sc}x'] = o
out = {'note': 'bytes of the files a skin loads (one language atlas + overlays) at each device scale; error = premultiplied per-channel difference to the shipped PNG, 0..255', 'rows': rows, 'perSkin': per_skin}
json.dump(out, open(os.path.join(ROOT, 'results', 'size-experiments.json'), 'w'), indent=1)
print('%-8s %2s %9s %9s %9s %9s %9s   pal maxErr  webp90 maxErr' % ('atlas', 'x', 'png', 'pngOpt', 'pngPal', 'webpLoss', 'webp90'))
for r in rows:
    print('%-8s %2d %9d %9d %9d %9d %9d   %6.1f      %6.1f' % (r['atlas'], r['scale'], r['png'], r['pngOpt'], r['pngPal'], r['webpLoss'], r['webp90'], r['pngPalError']['maxColour'], r['webp90Error']['maxColour']))
print()
for lang, v in per_skin.items():
    print(lang, {k: {kk: vv for kk, vv in x.items() if kk in ('png', 'webpLoss', 'webp90')} for k, x in v.items()})
