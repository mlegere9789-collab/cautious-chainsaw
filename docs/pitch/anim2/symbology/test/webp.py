"""WebP check (run by test/symbology.test.mjs, or: python test/webp.py [dist]).
Independently of tools/webp-pack.py: every atlas index lists filesWebp, each file exists, decodes to the PNG's picture exactly (premultiplied colour and alpha), and is smaller than the PNG.
Prints a JSON summary; exit code 1 on any violation."""
import json, os, sys
import numpy as np
from PIL import Image

dist = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'dist')
out = {'checked': 0, 'violations': [], 'saved': {}}
def pm(a):
    f = a.astype(np.float32); return np.concatenate([f[..., :3] * f[..., 3:4] / 255.0, f[..., 3:4]], axis=2)
tot = {}
for name in ['nato', 'shield', 'minimal', 'overlays']:
    idx = json.load(open(os.path.join(dist, 'atlas', name + '.json'), encoding='utf8'))
    if 'filesWebp' not in idx: out['violations'].append(f'{name}: no filesWebp in the index'); continue
    for sc in idx['scales']:
        png = os.path.join(dist, 'atlas', idx['files'][str(sc)]); wp = os.path.join(dist, 'atlas', idx['filesWebp'][str(sc)])
        if not os.path.exists(wp): out['violations'].append(f'{name}@{sc}x: {wp} missing'); continue
        a = Image.open(png).convert('RGBA'); b = Image.open(wp).convert('RGBA')
        if a.size != b.size: out['violations'].append(f'{name}@{sc}x: size {a.size} != {b.size}'); continue
        d = np.abs(pm(np.array(a)) - pm(np.array(b))).max()
        if d > 0: out['violations'].append(f'{name}@{sc}x: webp differs from png by {d}')
        if os.path.getsize(wp) >= os.path.getsize(png): out['violations'].append(f'{name}@{sc}x: webp is not smaller')
        t = tot.setdefault(sc, [0, 0]); t[0] += os.path.getsize(png); t[1] += os.path.getsize(wp); out['checked'] += 1
out['saved'] = {f'{k}x': round(1 - v[1] / v[0], 3) for k, v in tot.items()}
print(json.dumps(out)); sys.exit(1 if out['violations'] else 0)
