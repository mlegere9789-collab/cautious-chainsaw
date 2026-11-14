#!/usr/bin/env python3
"""Skyline test S1/S2 of criteria.json entry C-P27-P28-2 (Q16, third pass): does the far skyline of the photograph of Gettysburg from the Evergreen Cemetery lodge (P27/P28) agree with the
skyline of the bare-earth model seen from the documented place, with the heading free inside the NPS word's sector, the lens free and a vertical shift free, and is that station better than its neighbours?
Written after the criterion (2026-11-14T00:31:42Z) and before any model skyline was computed; the definitions are those of the criterion, nothing here was tuned to a result.
Usage: nice python3 -I tools/bt/photomatch/skyline_test.py        Output: tools/bt/photomatch/skyline_results.json and tmp/photomatch/skyline/P28_skyline_fit.png"""
import json, math, os, sys, time
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); BT = os.path.join(ROOT, 'docs', 'battle-theatre')
OUT = os.path.join(ROOT, 'tmp', 'photomatch', 'skyline'); os.makedirs(OUT, exist_ok=True)
# ---- DEM and coordinates (same maths as render.html / run.mjs / measure_c1.py)
Z15 = 2 ** 15 * 512
meta = json.load(open(os.path.join(BT, 'render', 'prototype', 'data', 'terrain.json'))); N = meta['N']; SC = (meta['hmax'] - meta['hmin']) / 65535
DEM = meta['hmin'] + np.fromfile(os.path.join(BT, 'render', 'prototype', 'data', 'height.bin'), dtype='<u2').astype(np.float64).reshape(N, N) * SC
BX, BY, BW, BH = meta['z15box']; MPP = meta['groundMPerZ15Px']; WM, HM = meta['widthM'], meta['heightM']
def xz(lng, lat):
    s = math.sin(lat * math.pi / 180); px = (lng + 180) / 360 * Z15; py = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * Z15
    return (px - BX - BW / 2) * MPP, (py - BY - BH / 2) * MPP
def at(x, z):
    u = (np.asarray(x) / WM + .5) * (N - 1); v = (np.asarray(z) / HM + .5) * (N - 1)
    i = np.clip(np.floor(u).astype(int), 0, N - 2); j = np.clip(np.floor(v).astype(int), 0, N - 2); fu = np.clip(u - i, 0, 1); fv = np.clip(v - j, 0, 1)
    return DEM[j, i] * (1 - fu) * (1 - fv) + DEM[j, i + 1] * fu * (1 - fv) + DEM[j + 1, i] * (1 - fu) * fv + DEM[j + 1, i + 1] * fu * fv
# ---- photograph skyline (frozen rule of the criterion)
def box(a, n, axis):
    k = np.ones(n) / n; return np.apply_along_axis(lambda v: np.convolve(v, k, mode='same'), axis, a)
def medf(v, n):
    r = n // 2; return np.array([np.median(v[max(0, i - r):i + r + 1]) for i in range(len(v))])
def photo_skyline():
    f = os.path.join(ROOT, 'tmp', 'photomatch', 'loc', 'ppmsca.35051_u4096.jpg'); im = Image.open(f).convert('L'); W0, H0 = im.size; c = [0.02, 0.03, 0.985, 0.97]
    im = im.crop((round(c[0] * W0), round(c[1] * H0), round(c[2] * W0), round(c[3] * H0))); w = 1024; h = round(im.height * w / im.width)
    g = np.asarray(im.resize((w, h), Image.LANCZOS)).astype(float); gs = box(g, 5, 0); ys = np.full(w, np.nan)
    for x in range(w):
        xa = max(0, x - 3); xb = min(w, x + 4); sky = np.median(g[int(0.2 * h):int(0.3 * h), xa:xb]); col = gs[:, xa:xb].mean(axis=1)
        idx = np.where(col[int(0.30 * h):int(0.60 * h)] < sky - 15)[0]
        if len(idx): ys[x] = idx[0] + int(0.30 * h)
    valid = ~np.isnan(ys); med = medf(np.where(valid, ys, np.nanmedian(ys)), 15)
    good = valid & (np.abs(ys - med) <= 10) & (np.arange(w) >= int(0.02 * w)) & (np.arange(w) <= int(0.76 * w))
    return g, ys, good, w, h
# ---- model skyline
AZ = np.arange(-110.0, 60.0 + 1e-9, 0.1)      # degrees from north, clockwise (negative = west of north)
DIST = np.arange(10.0, 7000.0 + 1, 10.0)
def model_skyline(ex, ez, eye_y):
    th = np.radians(AZ)[:, None]; x = ex + DIST[None, :] * np.sin(th); z = ez - DIST[None, :] * np.cos(th)
    el = (at(x, z) - eye_y) / DIST[None, :]
    return np.arctan(el.max(axis=1))             # radians, per azimuth
def fit(eps, ys, good, w, h, sectors):
    """One pass over the union grid of headings (0.25 degree steps) and fields (25 to 70 degrees, 1 degree steps); the best fit inside each named sector is taken from the same grid (identical to fitting each sector alone)."""
    cols = np.where(good)[0]; yph = ys[cols]; lo = min(a for a, _ in sectors.values()); hi = max(b for _, b in sectors.values()); hs = np.arange(lo, hi + 1e-9, 0.25); best = {k: None for k in sectors}
    for F in range(25, 71):
        fpx = (w / 2) / math.tan(math.radians(F) / 2); phi = np.arctan((cols - w / 2) / fpx); theta = hs[:, None] + np.degrees(phi)[None, :]
        e = np.interp(theta.ravel(), AZ, eps).reshape(theta.shape); y0 = h / 2 - fpx * np.tan(e) / np.cos(phi)[None, :]
        r = yph[None, :] - y0; v = r.mean(axis=1); rms = np.sqrt(((r - v[:, None]) ** 2).mean(axis=1))
        for k, (a, b) in sectors.items():
            m = (hs >= a - 1e-9) & (hs <= b + 1e-9); idx = np.where(m)[0]; j = idx[int(rms[idx].argmin())]
            if best[k] is None or rms[j] < best[k]['rms_px']: best[k] = {'rms_px': float(rms[j]), 'heading_deg': float(hs[j]), 'field_deg': F, 'v_px': float(v[j]), 'f_px': float(fpx)}
    for k in best: best[k]['rms_deg'] = best[k]['rms_px'] / best[k]['f_px'] * 180 / math.pi
    return best
def main():
    t0 = time.time(); g, ys, good, w, h = photo_skyline(); print('photo skyline columns', int(good.sum()), 'of', w, flush=True)
    S = {b['id']: b for b in json.load(open(os.path.join(BT, 'app', 'data', 'structures3d.json')))['buildings']}['STR-TOWN-GATEHOUSE']; r = S['ring'][:-1]
    lng = sum(p[0] for p in r) / len(r); lat = sum(p[1] for p in r) / len(r); ex, ez = xz(lng, lat); ground = float(at(ex, ez))
    sectors = {'P27 north (337.5 to 22.5)': (-22.5, 22.5), 'P28 northwest (292.5 to 337.5)': (-67.5, -22.5), 'union (292.5 to 22.5)': (-67.5, 22.5)}
    res = {'station': {'lng': round(lng, 6), 'lat': round(lat, 6), 'x_m': round(ex, 1), 'z_m': round(ez, 1), 'ground_m': round(ground, 2)}, 'columns': int(good.sum()), 'print_px': [w, h], 'agl': {}}
    eps8 = None
    for agl in (8.0, 5.0, 11.0):
        eps = model_skyline(ex, ez, ground + agl); eps8 = eps if agl == 8.0 else eps8
        res['agl'][str(agl)] = fit(eps, ys, good, w, h, sectors); print('agl', agl, {k: (round(v['rms_deg'], 3), v['heading_deg'], v['field_deg']) for k, v in res['agl'][str(agl)].items()}, round(time.time() - t0), 's', flush=True)
    ctrl = []
    for b in range(0, 360, 45):
        for d in (100, 200, 300):
            cx = ex + d * math.sin(math.radians(b)); cz = ez - d * math.cos(math.radians(b)); cg = float(at(cx, cz)); eps = model_skyline(cx, cz, cg + 8.0)
            f = fit(eps, ys, good, w, h, sectors); ctrl.append({'bearing_deg': b, 'distance_m': d, 'ground_m': round(cg, 2), **{k: round(v['rms_deg'], 4) for k, v in f.items()}})
    res['controls'] = ctrl; print('controls done', round(time.time() - t0), 's', flush=True)
    st = res['agl']['8.0']; summary = {}
    for k in sectors:
        cr = np.array([c[k] for c in ctrl]); q1 = float(np.percentile(cr, 25)); rms = st[k]['rms_deg']
        s1 = 'match-level' if rms <= 0.5 else 'partial' if rms <= 1.0 else 'mismatch'
        s1ok = s1 != 'mismatch' and 25 <= st[k]['field_deg'] <= 70
        summary[k] = {'S1_rms_deg': round(rms, 4), 'S1_class': s1, 'best_heading_deg': st[k]['heading_deg'], 'best_field_deg': st[k]['field_deg'], 'controls_min': round(float(cr.min()), 4), 'controls_q1': round(q1, 4), 'controls_median': round(float(np.median(cr)), 4), 'controls_max': round(float(cr.max()), 4),
                      'rank_of_station_among_25': int((cr < rms).sum()) + 1, 'S2_discriminated': bool(rms <= q1), 'agl_sensitivity_rms_deg': {a: round(res['agl'][a][k]['rms_deg'], 4) for a in res['agl']}}
    res['summary'] = summary
    json.dump({'_doc': 'Skyline test S1/S2 of criteria.json C-P27-P28-2 (definitions there; code skyline_test.py). rms_deg = root-mean-square vertical residual of the best fit (heading, field, vertical shift) between the photograph skyline and the bare-earth model skyline seen from the station; controls = 24 stations 100, 200, 300 m away in 8 directions with the same fit freedom.', **res}, open(os.path.join(HERE, 'skyline_results.json'), 'w'), indent=1)
    # figure: the photograph with the photograph skyline (red) and the model skyline at the best union fit (cyan)
    b = st['union (292.5 to 22.5)']; fpx = b['f_px']; cols = np.arange(w); phi = np.arctan((cols - w / 2) / fpx); e = np.interp(b['heading_deg'] + np.degrees(phi), AZ, eps8); ym = h / 2 - fpx * np.tan(e) / np.cos(phi) + b['v_px']
    O = Image.fromarray(np.stack([g, g, g], axis=2).astype(np.uint8)); d = ImageDraw.Draw(O)
    for x in range(w):
        if good[x]: d.point((x, int(ys[x])), fill=(255, 0, 0))
        if 0 <= ym[x] < h: d.point((x, int(ym[x])), fill=(0, 220, 255))
    O.crop((0, int(0.30 * h), w, int(0.62 * h))).resize((w * 2, int(0.32 * h) * 2), Image.LANCZOS).save(os.path.join(OUT, 'P28_skyline_fit.png'))
    print(json.dumps(summary, indent=1)); print('done', round(time.time() - t0), 's')
if __name__ == '__main__': main()
