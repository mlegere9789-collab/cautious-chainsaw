#!/usr/bin/env python3
"""Descriptive numbers of the P29 review sheet (view east from the Evergreen Cemetery gatehouse), Q16, fourth session (2026-11-15).
What: where the crest of the wooded hill stands in the NPS figure (the frozen photograph-skyline rule of criteria.json C-P29-1, imported unchanged from skyline_test.py) and where the highest point of the bare-earth render stands in the renders at the registered pose
(heading 90 degrees, field 40 degrees, level camera, 8 m) and at the 30 and 50 degree variants (first non-sky pixel of each column of the *_base.png render).
These numbers describe the sheet; they are NOT a criterion and nothing was tuned: C-P29-1 (the skyline test with 24 control stations) is the only test of this pose and is unchanged.
Inputs: tmp/photomatch/nps_pdf/pos/v1_p307-000_pos.png, tmp/photomatch/renders/P29{,_fov30,_fov50}_base.png.   Output: tools/bt/photomatch/p29_sheet_measurements.json
Usage: nice python3 -I tools/bt/photomatch/measure_p29_sheet.py"""
import json, os, sys, hashlib
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import skyline_test as S          # the frozen photograph-skyline rule; importing loads the DEM only (the tests run under __main__)
SKY = np.array([199, 209, 224])   # sky colour of render.html, as in compose.py
def render_skyline(path):
    B = np.asarray(Image.open(path).convert('RGB')).astype(int); d = np.abs(B - SKY).sum(axis=2) > 24; H, W = d.shape
    top = np.array([(int(np.argmax(d[:, x])) if d[:, x].any() else H) for x in range(W)], dtype=float)
    x_hi = int(np.argmin(top)); return {'render_px': [W, H], 'highest_point_row_frac': round(float(top.min()) / H, 3), 'highest_point_x_frac': round(x_hi / W, 3), 'left_edge_row_frac': round(float(np.median(top[:20])) / H, 3), 'right_edge_row_frac': round(float(np.median(top[-20:])) / H, 3)}
def main():
    g, ys, good, w, h = S.photo_skyline_p29(); cols = np.where(good)[0]; yy = ys[cols] / h; i = int(np.argmin(yy))
    def row_at(xf):
        c = int(xf * w); sel = cols[np.abs(cols - c) < 12]; return round(float(np.nanmedian(ys[sel]) / h), 3) if len(sel) else None
    img = os.path.join(ROOT, 'tmp', 'photomatch', 'nps_pdf', 'pos', 'v1_p307-000_pos.png')
    out = {'_doc': __doc__.split('\n')[0] + ' Descriptive numbers of the review sheet; not a criterion; nothing tuned.',
           'figure': {'file': 'tmp/photomatch/nps_pdf/pos/v1_p307-000_pos.png', 'sha256': hashlib.sha256(open(img, 'rb').read()).hexdigest(), 'resized_px': [w, h], 'kept_skyline_columns': int(good.sum()),
                      'crest_row_frac': round(float(yy.min()), 3), 'crest_x_frac': round(float(cols[i] / w), 3), 'left_edge_row_frac': row_at(0.05), 'row_frac_at_x': {str(x): row_at(x) for x in (0.05, 0.2, 0.4, 0.6, 0.74, 0.9)}},
           'render': {}}
    for key, suf in (('main_fov40', ''), ('fov30', '_fov30'), ('fov50', '_fov50')):
        f = os.path.join(ROOT, 'tmp', 'photomatch', 'renders', f'P29{suf}_base.png'); r = render_skyline(f); r['sha256'] = hashlib.sha256(open(f, 'rb').read()).hexdigest(); out['render'][key] = r
    # consistency of the two implementations of the same DEM and pose: the silhouette of the WebGL render (first non-sky pixel per column, main field) against the skyline that skyline_test.py ray-marches at the same station and camera height.
    import math
    r_ = next(x for x in json.load(open(os.path.join(HERE, 'resolved_poses.json')))['resolved'] if x['id'] == 'P29'); ex, ez = r_['x_m'], r_['z_m']; eye = float(S.at(ex, ez)) + r_['agl']
    B = np.asarray(Image.open(os.path.join(ROOT, 'tmp', 'photomatch', 'renders', 'P29_base.png')).convert('RGB')).astype(int); d_ = np.abs(B - SKY).sum(axis=2) > 24; Hh, Ww = d_.shape
    top = np.array([(int(np.argmax(d_[:, x])) if d_[:, x].any() else Hh) for x in range(Ww)], dtype=float); fpx = (Ww / 2) / math.tan(math.radians(r_['fovHDeg']) / 2)
    ph = np.arctan((np.arange(Ww) + 0.5 - Ww / 2) / fpx); AZ = np.arange(r_['headingDeg'] - 30, r_['headingDeg'] + 30.001, 0.05); eps = S.model_skyline(ex, ez, eye, AZ)
    pred = Hh / 2 - fpx * np.tan(np.interp(r_['headingDeg'] + np.degrees(ph), AZ, eps)) / np.cos(ph); dd = pred - top
    out['render_vs_raymarch'] = {'what': 'silhouette of the main render against the ray-marched model skyline at the same station, camera height, heading and field (both read the same DEM; a check of the tooling, not a test of the photograph)', 'mean_px': round(float(dd.mean()), 2), 'rms_px': round(float(math.sqrt((dd ** 2).mean())), 2), 'max_abs_px': round(float(np.abs(dd).max()), 2), 'rms_deg': round(math.degrees(math.atan(math.sqrt((dd ** 2).mean()) / fpx)), 3), 'frame_px': [Ww, Hh]}
    m = out['render']['main_fov40']; fg = out['figure']
    out['differences_at_registered_pose'] = {'crest_x_frac_difference_render_minus_photo': round(m['highest_point_x_frac'] - fg['crest_x_frac'], 3), 'crest_row_frac_difference_render_minus_photo': round(m['highest_point_row_frac'] - fg['crest_row_frac'], 3),
                                              'rise_of_crest_above_left_edge_photo': round(fg['left_edge_row_frac'] - fg['crest_row_frac'], 3), 'rise_of_crest_above_left_edge_render': round(m['left_edge_row_frac'] - m['highest_point_row_frac'], 3)}
    json.dump(out, open(os.path.join(HERE, 'p29_sheet_measurements.json'), 'w'), indent=1); print(json.dumps(out, indent=1))
if __name__ == '__main__': main()
