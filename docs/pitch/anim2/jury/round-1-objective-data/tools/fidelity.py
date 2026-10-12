"""fidelity.py - compare this harness's rebuilds of the forks' own pictures with the PNGs the forks shipped (round 1).  python fidelity.py"""
import json
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
A2 = os.path.join(HERE, 'snap', 'docs', 'pitch', 'anim2')
PAIRS = {
    'd1-s1a': 'd1-quiet-cartographer/shots/round-1/s1a-opening-field-z13.5-t551.png',
    'd1-s4': 'd1-quiet-cartographer/shots/round-1/s4-closeup-selected-z16.5-t551.png',
    'd4-s1a': 'd4-editorial/shots/round-1/S1a-field-z13.5-t551.png',
    'd4-s4': 'd4-editorial/shots/round-1/S4-selected-z16.5-t556.png',
}
out = {}
for k, rel in PAIRS.items():
    mine = os.path.join(HERE, 'results', 'fidelity', k + '.png')
    ship = os.path.join(A2, rel)
    if not (os.path.exists(mine) and os.path.exists(ship)):
        print(k, 'missing', os.path.exists(mine), os.path.exists(ship))
        continue
    a = np.asarray(Image.open(mine).convert('RGB')).astype(int)
    b = np.asarray(Image.open(ship).convert('RGB')).astype(int)
    if a.shape != b.shape:
        print(k, 'shape', a.shape, b.shape)
        out[k] = {'shape_mine': a.shape, 'shape_ship': b.shape}
        continue
    d = np.abs(a - b).max(axis=2)
    out[k] = {'mean_abs_diff': float(np.abs(a - b).mean()), 'share_px_diff_gt8': float((d > 8).mean()), 'share_px_diff_gt32': float((d > 32).mean()), 'share_identical': float((d == 0).mean())}
    print(k, json.dumps(out[k]))
    Image.fromarray(np.clip(d * 4, 0, 255).astype(np.uint8)).resize((a.shape[1] // 2, a.shape[0] // 2)).save(os.path.join(HERE, 'results', 'fidelity', k + '.diff.png'))
json.dump(out, open(os.path.join(HERE, 'results', 'fidelity.json'), 'w'), indent=1)
