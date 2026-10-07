"""Pixel checks on the shipped atlas PNGs (run by test/symbology.test.mjs, or: python test/pixels.py [dist]).
For every sprite of every atlas at every scale:
  1. the gutter (pad units around its rectangle) is fully transparent: no sprite bleeds into a neighbour;
  2. SOLID ink (alpha >= 200: plates, rings, echelon marks, glyphs) lies inside the sprite's `box` (+0.6 u): anything outside the box is shadow or glow only;
  3. the sprite is not empty and its ink touches no edge of its own rectangle (nothing is clipped).
Prints a JSON summary; exit code 1 on any violation."""
import json, sys, os
import numpy as np
from PIL import Image

dist = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'dist')
SOLID = 200
EDGE_ALPHA = 12      # a tail of the soft shadow below 5% alpha at the very edge is not a visible clip
out = {'atlases': {}, 'violations': []}
for name in ['nato', 'shield', 'minimal', 'overlays']:
    idx = json.load(open(os.path.join(dist, 'atlas', name + '.json'), encoding='utf8'))
    pad = idx['pad']; res = {'sprites': len(idx['sprites']), 'scales': {}}
    for sc in idx['scales']:
        im = np.array(Image.open(os.path.join(dist, 'atlas', idx['files'][str(sc)])).convert('RGBA'))
        H, W = im.shape[:2]; a = im[:, :, 3]
        assert (W, H) == (idx['size']['w'] * sc, idx['size']['h'] * sc), f'{name}@{sc}x size {W}x{H} != index'
        bad = 0; clipped = 0; outside = 0; worst_out = 0.0; worst_edge = 0
        covered = np.zeros_like(a, dtype=bool)
        for key, s in idx['sprites'].items():
            x0, y0, w, h = s['x'] * sc, s['y'] * sc, s['w'] * sc, s['h'] * sc
            g = pad * sc
            gx0, gy0, gx1, gy1 = max(0, x0 - g), max(0, y0 - g), min(W, x0 + w + g), min(H, y0 + h + g)
            region = a[gy0:gy1, gx0:gx1].copy()
            # the gutter = region minus the sprite rectangle
            mask = np.ones_like(region, dtype=bool); mask[y0 - gy0:y0 - gy0 + h, x0 - gx0:x0 - gx0 + w] = False
            # neighbours' own rectangles may intrude into the gutter only if pad < the distance; check pure transparency of the gutter
            if (region[mask] > 0).any():
                bad += 1; out['violations'].append(f'{name}@{sc}x {key}: ink in the gutter')
            spr = a[y0:y0 + h, x0:x0 + w]
            if not (spr > 0).any():
                out['violations'].append(f'{name}@{sc}x {key}: empty sprite'); continue
            edge = max(int(spr[0, :].max()), int(spr[-1, :].max()), int(spr[:, 0].max()), int(spr[:, -1].max()))
            worst_edge = max(worst_edge, edge)
            if edge > EDGE_ALPHA:
                clipped += 1; out['violations'].append(f'{name}@{sc}x {key}: ink (alpha {edge}) touches the sprite edge: clipped')
            # solid ink inside box
            bx0, by0, bx1, by1 = s['box']; tol = 0.6
            ys2, xs2 = np.where(spr >= SOLID)
            if len(xs2):
                ox0 = (bx0 - tol) * sc; oy0 = (by0 - tol) * sc; ox1 = (bx1 + tol) * sc; oy1 = (by1 + tol) * sc
                dx = max(0.0, ox0 - xs2.min(), xs2.max() + 1 - ox1); dy = max(0.0, oy0 - ys2.min(), ys2.max() + 1 - oy1)
                d = max(dx, dy) / sc
                if d > 0:
                    outside += 1; worst_out = max(worst_out, d); out['violations'].append(f'{name}@{sc}x {key}: solid ink {d:.2f} u outside its box')
        res['scales'][str(sc)] = {'w': W, 'h': H, 'gutterViolations': bad, 'clipped': clipped, 'solidOutsideBox': outside, 'worstOutsideU': round(worst_out, 2), 'worstEdgeAlpha': worst_edge}
    out['atlases'][name] = res
print(json.dumps(out, indent=1))
sys.exit(1 if out['violations'] else 0)
