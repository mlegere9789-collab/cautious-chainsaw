#!/usr/bin/env python3
"""Compose the per-pose review sheets and the machine-readable coarse numbers (Q16).
Inputs: poses.json (schema 2), resolved_poses.json, photo_crops.json, tmp/photomatch/renders/<pose>{,_fov30,_fov50}_{base,full}.png, the photograph files named by each pose.
Output: tools/bt/photomatch/reports/<pose>.jpg = row 1: photograph (print area) | render at the registered pose | overlay (cyan = relief edges of the render on the photograph; ticks = named landmarks as the model places them);
        row 2: render at 30 deg | render at 50 deg | the pose numbers. And metrics.json (horizon row of render and, when written into poses.json, of the photograph).
The numbers are only a coarse aid; the verdict is written by a person after looking at the sheet (verdicts.json).
Usage: python3 -I tools/bt/photomatch/compose.py [poseId ...]"""
import json, os, sys, numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
R = os.path.join(ROOT, 'tmp', 'photomatch', 'renders'); OUT = os.path.join(HERE, 'reports'); os.makedirs(OUT, exist_ok=True)
poses = {p['id']: p for p in json.load(open(os.path.join(HERE, 'poses.json')))['poses']}
res = {r['id']: r for r in json.load(open(os.path.join(HERE, 'resolved_poses.json')))['resolved']}
crops = json.load(open(os.path.join(HERE, 'photo_crops.json')))['crops']
want = sys.argv[1:]
def sobel(a):
    a = a.astype(float); gx = np.zeros_like(a); gy = np.zeros_like(a)
    gx[:, 1:-1] = a[:, 2:] - a[:, :-2]; gy[1:-1, :] = a[2:, :] - a[:-2, :]; return np.hypot(gx, gy)
def horizon_row(base):   # first row from the top where the render stops being sky (terrain shading differs from the sky colour)
    a = np.asarray(base.convert('RGB')).astype(int); sky = np.array([199, 209, 224]); d = np.abs(a - sky).sum(axis=2) > 24
    rows = np.where(d.mean(axis=1) > .5)[0]; return int(rows[0]) if len(rows) else None
PW = 480
def fit(im, w):
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
metrics = {}
for pid, p in poses.items():
    if want and pid not in want: continue
    full = os.path.join(R, pid + '_full.png'); base = os.path.join(R, pid + '_base.png')
    if not os.path.exists(full) or pid not in res: continue
    B = Image.open(base).convert('RGB'); F = Image.open(full).convert('RGB'); W, H = F.size; r = res[pid]
    hr = horizon_row(B); m = {'render_px': [W, H], 'render_horizon_row_frac': round(hr / H, 3) if hr is not None else None, 'photo_horizon_frac_judged_by_eye': p.get('photo_horizon_frac')}
    f = (p.get('photo') or {}).get('file'); ph = None
    if f and os.path.exists(os.path.join(ROOT, f)):
        ph = Image.open(os.path.join(ROOT, f)).convert('L'); c = crops.get(f); sz = crops.get(f + '#size')
        if c: ph = ph.crop((round(c[0] * ph.width), round(c[1] * ph.height), round(c[2] * ph.width), round(c[3] * ph.height)))
        ph = ph.resize((W, H), Image.LANCZOS)
    panels = []
    def label(im, text):
        d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 14], fill=(255, 255, 255)); d.text((3, 1), text, fill=(0, 0, 0)); return im
    P1 = label(fit(Image.merge('RGB', (ph, ph, ph)) if ph else Image.new('RGB', (W, H), (220, 220, 220)), PW), f"{pid} photo {p.get('loc_id')} (print area)" if ph else f"{pid} photo not read")
    P2 = label(fit(F, PW), f"render fov {r['fovHDeg']} head {r['headingDeg']} agl {r['agl']} (assumed pose)")
    if ph:
        a = np.asarray(ph); bl = np.asarray(B.convert('L')); e = sobel(bl) > 14; e = e | np.roll(e, 1, axis=1)
        ov = np.stack([a, a, a], axis=2).copy(); ov[e] = [0, 255, 255]; O = Image.fromarray(ov.astype(np.uint8))
    else: O = F.copy()
    d = ImageDraw.Draw(O)
    for li, q in enumerate(r.get('landmarks', [])):
        if q.get('front') and q.get('inside'):
            x, y = q['px'], q['py']; d.line([x, 0, x, H], fill=(255, 0, 0), width=1); d.rectangle([x - 3, y - 3, x + 3, y + 3], outline=(255, 255, 0), width=2); d.text((min(x + 4, W - 110), 14 + 12 * (li % 9)), q['name'][:22], fill=(255, 40, 40))
        elif q.get('front'): d.text((4 if q['px'] < 0 else W - 120, H - 14), ('< ' if q['px'] < 0 else '') + q['name'][:16] + ('' if q['px'] < 0 else ' >'), fill=(255, 40, 40))
    P3 = label(fit(O, PW), 'overlay: cyan = render relief edges; red ticks = landmarks as modelled')
    def small(suffix, txt):
        fp = os.path.join(R, pid + suffix + '_full.png')
        return label(fit(Image.open(fp).convert('RGB'), PW), txt) if os.path.exists(fp) else label(Image.new('RGB', (PW, round(PW * H / W)), (230, 230, 230)), txt + ' (missing)')
    P4 = small('_fov30', 'render fov %.0f (assumption variant)' % (r['fovHDeg'] - 10)); P5 = small('_fov50', 'render fov %.0f (assumption variant)' % (r['fovHDeg'] + 10))
    P6 = Image.new('RGB', (PW, P4.height), 'white'); dd = ImageDraw.Draw(P6)
    lines = [f"pose {pid}  loc {p.get('loc_id')}", f"position tier: {r['position_tier']}  sigma {p['position'].get('sigma_m')} m", f"heading tier: {r['heading_tier']}", f"lng {r['lng']} lat {r['lat']}", f"ground {r['ground_m']} m agl {r['agl']} m",
             f"anchor {r['anchor']}", f"fitted to photo: {p.get('fitted_to_photograph')}   staged flag: {p.get('staged_flag')}"] + ([f"distance from width: {r['relative']['distance_from_width_m']} m (building {r['relative']['building_width_m']} m wide)"] if r.get('relative') else [])
    for i, t in enumerate(lines): dd.text((6, 6 + 13 * i), t[:80], fill=(0, 0, 0))
    h1 = max(P1.height, P2.height, P3.height); h2 = max(P4.height, P5.height, P6.height)
    sheet = Image.new('RGB', (PW * 3, h1 + h2), 'white')
    for i, im in enumerate((P1, P2, P3)): sheet.paste(im, (i * PW, 0))
    for i, im in enumerate((P4, P5, P6)): sheet.paste(im, (i * PW, h1))
    sheet.save(os.path.join(OUT, pid + '.jpg'), quality=86); m['photo'] = bool(ph); metrics[pid] = m
mp = os.path.join(HERE, 'metrics.json'); old = json.load(open(mp)).get('metrics', {}) if os.path.exists(mp) and want else {}
old.update(metrics)
json.dump({'_doc': 'Coarse numbers only; the verdicts are in verdicts.json and PHOTOMATCH.md.', 'metrics': old}, open(mp, 'w'), indent=1)
print(len(metrics), 'sheets')
