#!/usr/bin/env python3
"""Find the print area (inside the plate border or the mount) of every photograph file named by a pose, so that renders get the photograph's aspect ratio.
Poses normally carry an explicit crop (read by eye); the detection below is only the fallback. Method: a column (row) belongs to the picture when the spread of its grey values (90th minus 10th percentile) is large; borders, mounts and plate edges are nearly uniform.
The longest run of such columns (rows), allowing short gaps, is the picture; it is inset by 1 percent. Poses may override with an explicit [x0,y0,x1,y1] in fractions.
Output: tools/bt/photomatch/photo_crops.json {crops: {file: [fx0,fy0,fx1,fy1], file#size: [W,H]}}, and tmp/photomatch/work/crops_sheet.jpg for a look.
Usage: python3 -I tools/bt/photomatch/crops.py"""
import json, os, numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
def longest_run(ok, gap=6):
    best = (0, -1); i = 0; n = len(ok)
    while i < n:
        if not ok[i]: i += 1; continue
        j = i; last = i
        while j < n and (ok[j] or j - last <= gap):
            if ok[j]: last = j
            j += 1
        if last - i > best[1] - best[0]: best = (i, last)
        i = last + 1
    return best
def detect(path, thr=38):
    im = Image.open(path).convert('L'); W, H = im.size; s = 700 / max(W, H); g = np.asarray(im.resize((max(1, round(W * s)), max(1, round(H * s))), Image.BILINEAR)).astype(float)
    cs = np.percentile(g, 90, axis=0) - np.percentile(g, 10, axis=0); c0, c1 = longest_run(cs > thr)
    sub = g[:, c0:c1 + 1]; rs = np.percentile(sub, 90, axis=1) - np.percentile(sub, 10, axis=1); r0, r1 = longest_run(rs > thr)
    h, w = g.shape; ix, iy = 0.01 * (c1 - c0), 0.01 * (r1 - r0)
    return [round((c0 + ix) / w, 4), round((r0 + iy) / h, 4), round((c1 - ix) / w, 4), round((r1 - iy) / h, 4)], (W, H)
def main():
    P = json.load(open(os.path.join(HERE, 'poses.json')))['poses']; files = []
    for p in P:
        f = (p.get('photo') or {}).get('file')
        if f and f not in files: files.append(f)
    crops = {}; tiles = []
    for f in files:
        full = os.path.join(ROOT, f)
        if not os.path.exists(full): print('missing', f); continue
        W, H = Image.open(full).size; crops[f + '#size'] = [W, H]
        explicit = [(q['photo'].get('crop')) for q in P if (q.get('photo') or {}).get('file') == f and isinstance(q['photo'].get('crop'), list)]
        c = explicit[0] if explicit else detect(full)[0]; crops[f] = c
        im = Image.open(full).convert('RGB'); im.thumbnail((380, 300)); d = ImageDraw.Draw(im); w, h = im.size
        d.rectangle([c[0] * w, c[1] * h, c[2] * w, c[3] * h], outline=(255, 0, 0), width=2); d.text((3, 3), os.path.basename(f)[:44], fill=(255, 255, 0)); tiles.append(im)
    json.dump({'_doc': 'Print areas as fractions of each image file, found by crops.py (grey-value spread per column and row). Inspect tmp/photomatch/work/crops_sheet.jpg.', 'crops': crops}, open(os.path.join(HERE, 'photo_crops.json'), 'w'), indent=1)
    cols = 4; rows = (len(tiles) + cols - 1) // cols
    if tiles:
        sh = Image.new('RGB', (cols * 385, rows * 305), 'white')
        for i, t in enumerate(tiles): sh.paste(t, ((i % cols) * 385, (i // cols) * 305))
        os.makedirs(os.path.join(ROOT, 'tmp', 'photomatch', 'work'), exist_ok=True); sh.save(os.path.join(ROOT, 'tmp', 'photomatch', 'work', 'crops_sheet.jpg'), quality=82)
    print(len(files), 'files')
if __name__ == '__main__': main()
