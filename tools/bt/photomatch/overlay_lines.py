#!/usr/bin/env python3
"""Lay the road lines (cyan), building outlines (red) and fences (orange) of a render on the photograph of its pose, at the registered field (Q16 review aid; third pass).
Why: compose.py overlays only the relief edges of the terrain; the road and building lines of the model are in the 'full' render, and whether the road of the model runs where the road of the photograph runs is the first thing a reviewer looks at.
Inputs: poses.json (photo file and print area), tmp/photomatch/renders/<pose>_full.png and _base.png. Output: tools/bt/photomatch/reports/<pose>_lines.jpg. The lines are drawn exactly where the render put them; nothing is shifted.
Usage: python3 -I tools/bt/photomatch/overlay_lines.py P27 P28 [--fov 30|50]"""
import json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); R = os.path.join(ROOT, 'tmp', 'photomatch', 'renders'); OUT = os.path.join(HERE, 'reports')
def thick(m):
    t = m.copy(); t[:, 1:] |= m[:, :-1]; t[1:, :] |= m[:-1, :]; return t
def main():
    poses = {p['id']: p for p in json.load(open(os.path.join(HERE, 'poses.json')))['poses']}; args = [a for a in sys.argv[1:] if not a.startswith('--')]
    suffix = '_fov%s' % sys.argv[sys.argv.index('--fov') + 1] if '--fov' in sys.argv else ''
    args = [a for a in args if a in poses]
    for pid in args:
        p = poses[pid]; f = p['photo']['file']; c = p['photo']['crop']; ph = Image.open(os.path.join(ROOT, f)).convert('L'); W, H = ph.size; ph = ph.crop((round(c[0] * W), round(c[1] * H), round(c[2] * W), round(c[3] * H)))
        full = Image.open(os.path.join(R, f'{pid}{suffix}_full.png')).convert('RGB'); base = Image.open(os.path.join(R, f'{pid}{suffix}_base.png')).convert('RGB'); ph = ph.resize(full.size, Image.LANCZOS)
        a = np.asarray(ph).astype(float); f_ = np.asarray(full).astype(int); b_ = np.asarray(base).astype(int); diff = np.abs(f_ - b_).sum(axis=2) > 30
        road = diff & (np.abs(f_ - np.array([26, 153, 255])).max(axis=2) <= 40); bld = diff & (np.abs(f_ - np.array([255, 0, 76])).max(axis=2) <= 40); fen = diff & (np.abs(f_ - np.array([255, 140, 0])).max(axis=2) <= 40)
        rgb = np.stack([a, a, a], axis=2); rgb[thick(road)] = [0, 200, 255]; rgb[thick(bld)] = [255, 0, 80]; rgb[thick(fen)] = [255, 160, 0]
        Image.fromarray(rgb.astype(np.uint8)).save(os.path.join(OUT, f'{pid}{suffix}_lines.jpg'), quality=86); print(pid + suffix, 'written')
if __name__ == '__main__': main()
