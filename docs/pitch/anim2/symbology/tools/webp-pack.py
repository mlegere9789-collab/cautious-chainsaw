"""Build step: write a lossless WebP next to every atlas PNG and prove it is the same picture.
   python tools/webp-pack.py [dist-dir]          (build.mjs runs it after the atlases are written)

For every dist/atlas/<id>.json and every scale it
  1. encodes <id>@<scale>x.png as <id>@<scale>x.webp, lossless (libwebp through Pillow, method 6; the colour hidden under fully transparent pixels is not kept, which is why it is smaller),
  2. decodes it again and compares it with the PNG on premultiplied colour and on alpha: any difference at all fails the step and the .webp is removed,
  3. records `filesWebp` in the atlas index (the runtime picks it with loadAtlas(..., { webp: true })) and the byte counts in results/webp-pack[-<palette>].json.
The PNG stays the reference and the fallback; nothing in the index points at a .webp that failed the comparison."""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, 'dist')
atlas_dir = os.path.join(dist, 'atlas')
report = {'dist': os.path.basename(dist), 'atlases': {}, 'totals': {}}

def premult(a):
    f = a.astype(np.float32)
    return np.concatenate([f[..., :3] * f[..., 3:4] / 255.0, f[..., 3:4]], axis=2)

tot = {}
for name in ['nato', 'shield', 'minimal', 'overlays']:
    fx = os.path.join(atlas_dir, name + '.json')
    if not os.path.exists(fx):
        continue
    idx = json.load(open(fx, encoding='utf8')); files = {}; res = {}
    for sc in idx['scales']:
        png = os.path.join(atlas_dir, idx['files'][str(sc)]); webp = png[:-4] + '.webp'
        im = Image.open(png).convert('RGBA'); im.save(webp, 'WEBP', lossless=True, quality=100, method=6)
        back = Image.open(webp).convert('RGBA'); d = np.abs(premult(np.array(im)) - premult(np.array(back)))
        if d.max() > 0:
            os.remove(webp); raise SystemExit(f'{name}@{sc}x: the lossless WebP differs from the PNG (max {d.max()})')
        files[str(sc)] = os.path.basename(webp); res[f'{sc}x'] = {'png': os.path.getsize(png), 'webp': os.path.getsize(webp), 'maxPremultipliedDifference': 0.0}
        t = tot.setdefault(f'{sc}x', {'png': 0, 'webp': 0}); t['png'] += res[f'{sc}x']['png']; t['webp'] += res[f'{sc}x']['webp']
    idx['filesWebp'] = files
    json.dump(idx, open(fx, 'w', encoding='utf8'), separators=(',', ':'))
    report['atlases'][name] = res
report['totals'] = {k: {**v, 'saved': round(1 - v['webp'] / v['png'], 3)} for k, v in tot.items()}
suffix = '' if os.path.basename(dist) == 'dist' else '-' + os.path.basename(dist)[5:]
os.makedirs(os.path.join(ROOT, 'results'), exist_ok=True)
json.dump(report, open(os.path.join(ROOT, 'results', f'webp-pack{suffix}.json'), 'w'), indent=1)
print('webp-pack:', json.dumps(report['totals']))
