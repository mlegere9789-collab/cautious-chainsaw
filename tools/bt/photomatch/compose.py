#!/usr/bin/env python3
"""Compose the photo | render | edge-overlay triptychs and the machine-readable results.
Inputs: poses.json, resolved_poses.json, images_ledger.json, tmp/photomatch/renders/*.png, tmp/photomatch/img/*_1600.jpg.
Outputs: tools/bt/photomatch/reports/<pose>.jpg (small derived JPEGs of public-domain photographs), metrics.json.
The edge overlay is cyan = Sobel edges of the rendered terrain (relief, silhouette); orange/red/blue-ish lines = fences / building footprints / roads as drawn in the render.
Metrics are only a coarse numeric aid (horizon-row difference). They never decide a verdict: the verdict is written by a person looking at the image."""
import json, os, numpy as np
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
R = os.path.join(ROOT, 'tmp', 'photomatch', 'renders'); OUT = os.path.join(HERE, 'reports'); os.makedirs(OUT, exist_ok=True)
poses = {p['id']: p for p in json.load(open(os.path.join(HERE, 'poses.json')))['poses']}
res = {r['id']: r for r in json.load(open(os.path.join(HERE, 'resolved_poses.json')))['resolved']}
led = json.load(open(os.path.join(HERE, 'images_ledger.json')))['images']
def sobel(a):
    a = a.astype(float); gx = np.zeros_like(a); gy = np.zeros_like(a)
    gx[:, 1:-1] = a[:, 2:] - a[:, :-2]; gy[1:-1, :] = a[2:, :] - a[:-2, :]; return np.hypot(gx, gy)
def horizon_row(base):   # first row from the top where the render stops being sky (terrain shading differs from the sky colour)
    a = np.asarray(base.convert('RGB')).astype(int); sky = np.array([199, 209, 224])
    d = np.abs(a - sky).sum(axis=2) > 24
    rows = np.where(d.mean(axis=1) > .5)[0]; return int(rows[0]) if len(rows) else None
metrics = {}
for pid, p in poses.items():
    key = p.get('photo_key'); full = os.path.join(R, pid + '_full.png'); base = os.path.join(R, pid + '_base.png')
    if not os.path.exists(full): continue
    B = Image.open(base).convert('RGB'); F = Image.open(full).convert('RGB'); W, H = F.size
    m = {'render_px': [W, H], 'render_horizon_row_frac': None}
    hr = horizon_row(B); m['render_horizon_row_frac'] = round(hr / H, 3) if hr is not None else None
    if not key or key not in led or led[key].get('status') != 'ok':
        F.save(os.path.join(OUT, pid + '_render_only.jpg'), quality=88); m['photo'] = None; metrics[pid] = m; continue
    L = led[key]; ph = Image.open(os.path.join(ROOT, L['local_working_1600'])).convert('L')
    crop = p.get('photo_crop_1600'); ph = ph.crop(tuple(crop)) if crop else ph
    ph = ph.resize((W, H), Image.LANCZOS); a = np.asarray(ph)
    # photo horizon (only recorded if the person judged it and wrote photo_horizon_frac into poses.json)
    m['photo_horizon_frac_judged_by_eye'] = p.get('photo_horizon_frac')
    bl = np.asarray(B.convert('L')); e = sobel(bl) > 14      # strong relief/silhouette edges only (shading banding is below this)
    e = e | np.roll(e, 1, axis=1)
    ov = np.stack([a, a, a], axis=2).copy(); ov[e] = [0, 255, 255]
    fa = np.asarray(F).astype(int); ba = np.asarray(B).astype(int); st = (np.abs(fa - ba).sum(axis=2) > 30)
    ov[st] = fa[st]
    tri = Image.new('RGB', (W * 3, H + 22), 'white'); tri.paste(Image.merge('RGB', (ph, ph, ph)), (0, 22)); tri.paste(F, (W, 22)); tri.paste(Image.fromarray(ov.astype(np.uint8)), (2 * W, 22))
    d = ImageDraw.Draw(tri); d.text((4, 4), f"{pid}  photo {key} (cropped to the print area)", fill='black'); d.text((W + 4, 4), f"render fov_h {res[pid]['fovHDeg']} heading {res[pid]['headingDeg']} agl {res[pid]['agl']} (assumed)", fill='black'); d.text((2 * W + 4, 4), 'overlay: cyan = render relief edges; coloured = fences/buildings/roads', fill='black')
    tri = tri.resize((tri.width * 2 // 3, tri.height * 2 // 3), Image.LANCZOS); tri.save(os.path.join(OUT, pid + '.jpg'), quality=85); metrics[pid] = m
json.dump({'_doc': 'Coarse numbers only; verdicts are in PHOTOMATCH.md and verdicts.json.', 'metrics': metrics}, open(os.path.join(HERE, 'metrics.json'), 'w'), indent=1)
print(len(metrics), 'composites')
