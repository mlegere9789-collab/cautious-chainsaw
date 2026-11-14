#!/usr/bin/env python3
"""Measure the three binary tests T1, T2, T3 of criteria.json entry C-P27-P28-1 on the renders of P27 and P28 (Q16, third pass).
Written 2026-11-14 BEFORE the renders of P27 and P28 existed (the render job was waiting in the machine lock queue); nothing here was tuned to a picture.
Definitions (the criterion text is in criteria.json; this file only makes it computable, the choices are listed here so that a reader can object):
 T2  horizon: first row from the top where more than half of the pixels of the BASE render (terrain only) differ from the sky colour (199,209,224) by a summed channel distance above 24
     (the function of compose.py, copied); pass iff |row / height - 0.47| <= 0.10.
 T1  side of the Baltimore Pike: the vertices of road RD-001 (structures3d.json, densified to at most 8 m, lifted 0.15 m, as render.html draws it) are projected with the camera of the pose
     (resolved_poses.json, the same matrices as render.html); a vertex counts as VISIBLE when it is in front of the camera, inside the frame and the pixel of the FULL render at that place
     (3x3 neighbourhood) has the road line colour (26,153,255) +-40 while the BASE render does not (so terrain occlusion is taken from the render itself). pass iff there is at least one visible vertex and
     the largest x of the visible vertices is <= 0.55 of the frame width; fail iff a visible vertex lies right of that; 'empty' when no vertex is visible (then T1 is neither passed nor failed: the verdict rule has no case for it
     and the conservative reading, not a pass, is used).
 T3  town band: the centre of the extent (min x, max x) of ALL pixels of the FULL render that carry the building line colour (255,0,76) +-40 and differ from the BASE render, as a fraction of the frame width;
     pass iff it lies in [0.05, 0.60]. Beside it the projected x of the gazetteer centre of the borough (GZ-072) is reported (the second reading of 'the borough footprint band'); if the two readings
     disagree on pass or fail, the result is 'disagree' and the conservative reading (not a pass) is used.
Output: tools/bt/photomatch/criteria_measurements.json (one entry per pose and field: P27/P28 x main, 30, 50 degrees) and a printed table.
Usage: python3 -I tools/bt/photomatch/measure_c1.py [P27 P28]"""
import json, math, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); BT = os.path.join(ROOT, 'docs', 'battle-theatre')
R = os.path.join(ROOT, 'tmp', 'photomatch', 'renders')
Z15 = 2 ** 15 * 512
meta = json.load(open(os.path.join(BT, 'render', 'prototype', 'data', 'terrain.json')))
N = meta['N']; SC = (meta['hmax'] - meta['hmin']) / 65535
H_DEM = meta['hmin'] + np.fromfile(os.path.join(BT, 'render', 'prototype', 'data', 'height.bin'), dtype='<u2').astype(np.float64).reshape(N, N) * SC
BX, BY, BW, BH = meta['z15box']; MPP = meta['groundMPerZ15Px']
def xz(lng, lat):
    s = math.sin(lat * math.pi / 180); px = (lng + 180) / 360 * Z15; py = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * Z15
    return (px - BX - BW / 2) * MPP, (py - BY - BH / 2) * MPP
def at(x, z):
    u = (x / meta['widthM'] + .5) * (N - 1); v = (z / meta['heightM'] + .5) * (N - 1)
    i = max(0, min(N - 2, math.floor(u))); j = max(0, min(N - 2, math.floor(v))); fu = min(1, max(0, u - i)); fv = min(1, max(0, v - j))
    return H_DEM[j, i] * (1 - fu) * (1 - fv) + H_DEM[j, i + 1] * fu * (1 - fv) + H_DEM[j + 1, i] * (1 - fu) * fv + H_DEM[j + 1, i + 1] * fu * fv
def view_proj(ex, ey, ez, yaw_deg, pitch_deg, fov_h_deg, aspect):
    yaw = math.radians(yaw_deg); pit = math.radians(pitch_deg)
    f = np.array([math.sin(yaw) * math.cos(pit), math.sin(pit), -math.cos(yaw) * math.cos(pit)]); up0 = np.array([0., 1., 0.])
    r = np.cross(f, up0); r /= np.linalg.norm(r); u = np.cross(r, f); e = np.array([ex, ey, ez])
    V = np.array([[r[0], r[1], r[2], -r @ e], [u[0], u[1], u[2], -u @ e], [-f[0], -f[1], -f[2], f @ e], [0, 0, 0, 1.]])
    t = 1 / math.tan(math.radians(fov_h_deg) / 2); n, fa = 1., 12000.
    P = np.array([[t, 0, 0, 0], [0, t * aspect, 0, 0], [0, 0, -(fa + n) / (fa - n), -2 * fa * n / (fa - n)], [0, 0, -1, 0.]])
    return P @ V
def project(M, x, y, z, W, Hh):
    c = M @ np.array([x, y, z, 1.]); w = c[3]
    if w <= 0: return None
    nx, ny = c[0] / w, c[1] / w
    return float((nx * .5 + .5) * W), float((1 - (ny * .5 + .5)) * Hh), bool(abs(nx) <= 1 and abs(ny) <= 1)
def horizon_row(base):   # compose.py, copied
    a = np.asarray(base.convert('RGB')).astype(int); sky = np.array([199, 209, 224]); d = np.abs(a - sky).sum(axis=2) > 24
    rows = np.where(d.mean(axis=1) > .5)[0]; return int(rows[0]) if len(rows) else None
def colour_mask(full, base, rgb, tol=40):
    f = np.asarray(full.convert('RGB')).astype(int); b = np.asarray(base.convert('RGB')).astype(int)
    return (np.abs(f - np.array(rgb)).max(axis=2) <= tol) & (np.abs(f - b).sum(axis=2) > 30)
def densify(coords, lift):
    out = []
    for (la, lb) in zip(coords[:-1], coords[1:]):
        x0, z0 = xz(*la); x1, z1 = xz(*lb); L = math.hypot(x1 - x0, z1 - z0); m = max(1, math.ceil(L / 8))
        for s in range(m + 1):
            a = s / m; x = x0 + (x1 - x0) * a; z = z0 + (z1 - z0) * a; out.append((x, at(x, z) + lift, z))
    return out
def main():
    want = [a for a in sys.argv[1:] if not a.startswith('-')] or ['P27', 'P28']
    S = json.load(open(os.path.join(BT, 'app', 'data', 'structures3d.json'))); rd = [r for r in S['roads'] if r['id'] == 'RD-001'][0]
    road = [v for line in rd['lines'] for v in densify(line, 0.15)]
    gz = {p['id']: p for p in json.load(open(os.path.join(BT, 'app', 'data', 'gazetteer.json')))['places']}; g72 = gz['GZ-072']['center']
    res = {r['id']: r for r in json.load(open(os.path.join(HERE, 'resolved_poses.json')))['resolved']}
    out = {}
    for pid in want:
        if pid not in res: print(pid, 'not resolved yet'); continue
        r = res[pid]
        for suffix, dfov in (('', 0), ('_fov30', -10), ('_fov50', 10)):
            fb, ff = os.path.join(R, f'{pid}{suffix}_base.png'), os.path.join(R, f'{pid}{suffix}_full.png')
            if not (os.path.exists(fb) and os.path.exists(ff)): print(pid, suffix or 'main', 'render missing'); continue
            base = Image.open(fb).convert('RGB'); full = Image.open(ff).convert('RGB'); W, Hh = base.size
            hr = horizon_row(base); hf = None if hr is None else hr / Hh; t2 = None if hf is None else bool(abs(hf - 0.47) <= 0.10)
            ex, ez = r['x_m'], r['z_m']; ey = r['ground_m'] + r['agl']
            M = view_proj(ex, ey, ez, r['headingDeg'], r['pitchDeg'], r['fovHDeg'] + dfov, W / Hh)
            roadmask = colour_mask(full, base, (26, 153, 255)); vis = []
            for (x, y, z) in road:
                p = project(M, x, y, z, W, Hh)
                if not p or not p[2]: continue
                ix, iy = int(round(p[0])), int(round(p[1]))
                if roadmask[max(0, iy - 1):iy + 2, max(0, ix - 1):ix + 2].any(): vis.append(p[0] / W)
            t1 = None if not vis else bool(max(vis) <= 0.55)
            bm = colour_mask(full, base, (255, 0, 76)); xs = np.where(bm.any(axis=0))[0]
            t3 = None; ctr = None
            if len(xs): ctr = float((xs.min() + xs.max()) / 2 / W); t3a = bool(0.05 <= ctr <= 0.60)
            gx, gz_ = xz(g72['lng'], g72['lat']); pg = project(M, gx, at(gx, gz_) + 8, gz_, W, Hh); g72x = None if not pg else (pg[0] / W if pg[2] else ('outside the frame, left' if pg[0] < 0 else 'outside the frame, right' if pg[0] > W else 'above or below the frame'))
            if ctr is not None:
                gpass = bool(0.05 <= g72x <= 0.60) if isinstance(g72x, float) else False
                t3 = t3a if gpass == t3a else 'disagree'
            out[f'{pid}{suffix or "_main"}'] = {'pose': pid, 'field_h_deg': r['fovHDeg'] + dfov, 'heading_deg': r['headingDeg'], 'render_px': [W, Hh], 'T2_horizon_frac': None if hf is None else round(hf, 3), 'T2_pass': t2,
                'T1_visible_road_vertices': len(vis), 'T1_max_x_frac': None if not vis else round(max(vis), 3), 'T1_min_x_frac': None if not vis else round(min(vis), 3), 'T1_pass': t1 if t1 is not None else 'empty',
                'T3_building_pixel_extent_centre_frac': None if ctr is None else round(float(ctr), 3), 'T3_building_pixels': int(bm.sum()), 'T3_gz072_x_frac': g72x if not isinstance(g72x, float) else round(g72x, 3), 'T3_pass': t3 if t3 is not None else 'empty'}
    mp = os.path.join(HERE, 'criteria_measurements.json'); old = json.load(open(mp)).get('measurements', {}) if os.path.exists(mp) else {}
    old.update(out)
    json.dump({'_doc': 'Measurements of the tests T1-T3 of criteria.json C-P27-P28-1 by measure_c1.py (definitions in its docstring). Computed from the renders; no number was set by hand.', 'measurements': old}, open(mp, 'w'), indent=1)
    for k, v in out.items(): print(k, {a: b for a, b in v.items() if a not in ('pose', 'render_px')})
if __name__ == '__main__': main()
