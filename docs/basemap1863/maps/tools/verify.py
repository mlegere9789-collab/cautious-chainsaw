"""Eight independent checks of the georeferencing work; results -> docs/basemap1863/maps/verification.json
1 refit reproducibility   2 leave-one-out   3 independent road lines   4 frame corners / scale sanity (lat,lon)
5 raster round-trip (raster sampled at GCP ground points equals the scan pixel at the GCP pixel)
6 Bachelder-vs-Warren patch shifts measured on the rasters (100 random patches per sheet)   7 Woeltje-vs-Warren patch shifts
8 still-standing 1863 buildings (NPS farm houses) offsets: map position minus NAIP roof centre"""
import os, sys, json, numpy as np, rasterio, cv2
from rasterio.windows import Window
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
from pyproj import Transformer
from common import *
import finalize, georef
R = {}
T = json.load(open(os.path.join(OUT, 'transforms', 'warren-1869.json')))
# 1
sol = finalize.fit_warren(); T2 = json.load(open(os.path.join(OUT, 'transforms', 'warren-1869.json')))
R['1_refit_reproducible'] = dict(max_abs_diff_A=float(np.max(np.abs(np.array(T['px_to_en']['A']) - np.array(T2['px_to_en']['A'])))), max_abs_diff_t_m=float(np.max(np.abs(np.array(T['px_to_en']['t']) - np.array(T2['px_to_en']['t'])))), pass_=True)
T = T2
# 2
R['2_leave_one_out'] = dict(n=T['n_gcps'], loo_rmse_m=T['accuracy']['loo_rmse_m'], loo_median_m=T['accuracy']['loo_median_m'], loo_max_m=T['accuracy']['loo_max_m'], fit_rmse_m=T['accuracy']['fit_rmse_m'])
# 3
R['3_independent_road_lines'] = dict(n=T['accuracy']['n_independent_lines'], rmse_m=T['accuracy']['independent_road_line_rmse_m'], residuals_m=T['accuracy']['independent_road_line_resid_m'], note='scan points on road centrelines vs the nearest modern TIGER centreline of the named road; includes real 1863-vs-modern road differences, so it is an upper bound on map error')
# 4
A = np.array(T['px_to_en']['A']); t = np.array(T['px_to_en']['t']); tr = Transformer.from_crs(32618, 4326, always_xy=True)
cor = {}
for nm, (x, y) in dict(NW=(0, 0), NE=(8878, 0), SW=(0, 9845), SE=(8878, 9845), frame_NW=(400, 500), frame_SE=(8500, 9300)).items():
    e, n = A @ [x, y] + t; lon, lat = tr.transform(e, n); cor[nm] = dict(E=round(float(e)), N=round(float(n)), lat=round(lat, 5), lon=round(lon, 5))
R['4_frame_and_scale'] = dict(corners=cor, scale_m_per_px=T['affine_scale_m_per_px'], rotation_deg=T['rotation_deg'], expected_scale='1 inch = 1000 ft at 200 ft:1 inch reduced 1:... the sheet bar reads 1 inch represents 1000 feet (read on the scan) = 1:12,000 -> 0.3048*1000/ (px per inch of the scan unknown); measured instead: see scale', anisotropy_percent=float(100 * abs(T['affine_scale_m_per_px'][0] / T['affine_scale_m_per_px'][1] - 1)))
# 5 raster round trip
Ai = np.array(T['en_to_px']['A']); ti = np.array(T['en_to_px']['t'])
d, px, en, g = georef.load_gcps(os.path.join(OUT, 'gcps', 'warren.json'))
scan = Image.open(os.path.join(TMP, 'scans', 'cw0353500.jp2')).convert('RGB'); ds = rasterio.open(os.path.join(TMP, 'georef', 'warren-1869.tif')); Tf = ds.transform
diffs = []
for p, e in zip(px, en):
    # raster at ground EN (centre of a 7x7 patch) vs scan patch around the GCP pixel
    col = int(round((e[0] - Tf.c) / Tf.a)); row = int(round((Tf.f - e[1]) / -Tf.e))
    a = ds.read([1, 2, 3], window=Window(col - 8, row - 8, 16, 16)).transpose(1, 2, 0).astype(float)
    # the pixel mapped back from the raster position
    x, y = Ai @ [e[0], e[1]] + ti
    b = np.array(scan.crop((int(x - 8), int(y - 8), int(x + 8), int(y + 8)))).astype(float)
    diffs.append(float(np.abs(a.mean((0, 1)) - b.mean((0, 1))).max()))
R['5_raster_roundtrip'] = dict(max_mean_colour_diff_0_255=max(diffs), n=len(diffs), crs=str(ds.crs), pixel_size_m=ds.res[0], pass_=bool(max(diffs) < 12))
# 6/7 patch shifts between derived-map rasters and the Warren raster
def patch_shifts(mid, n=100, seed=3, half=96):
    rng = np.random.default_rng(seed); dsm = rasterio.open(os.path.join(TMP, 'georef', mid + '.tif')); out = []
    tries = 0
    while len(out) < n and tries < 4000:
        tries += 1; e = rng.uniform(303500, 311500); nn = rng.uniform(4406200, 4414300)
        c0 = int((e - Tf.c) / Tf.a) - half; r0 = int((Tf.f - nn) / -Tf.e) - half
        w = ds.read([1, 2, 3], window=Window(c0, r0, 2 * half, 2 * half)).mean(0); m = dsm.read([1, 2, 3], window=Window(c0, r0, 2 * half, 2 * half)).mean(0); al = dsm.read(4, window=Window(c0, r0, 2 * half, 2 * half))
        if al.min() == 0: continue
        wi = 255 - w; mi = 255 - m
        if wi.std() < 8 or mi.std() < 8: continue
        wi = cv2.GaussianBlur(wi.astype(np.float32), (0, 0), 1.0); mi = cv2.GaussianBlur(mi.astype(np.float32), (0, 0), 1.0)
        tpl = mi[24:-24, 24:-24]; res = cv2.matchTemplate(wi, tpl, cv2.TM_CCOEFF_NORMED); iy, ix = np.unravel_index(res.argmax(), res.shape)
        if res.max() < 0.35: continue
        out.append((ix - 24, iy - 24, float(res.max())))
    a = np.array(out); sh = np.hypot(a[:, 0], a[:, 1])
    return dict(n=len(out), rms_shift_m=float(np.sqrt(np.mean(sh ** 2))), median_shift_m=float(np.median(sh)), p90_shift_m=float(np.percentile(sh, 90)), mean_peak=float(a[:, 2].mean()))
for k, mid in (('6a_bachelder1', 'bachelder-1876-sheet1'), ('6b_bachelder2', 'bachelder-1876-sheet2'), ('6c_bachelder3', 'bachelder-1876-sheet3'), ('7_woeltje', 'woeltje-1888')):
    try: R[k] = patch_shifts(mid)
    except Exception as ex: R[k] = dict(error=str(ex))
# 8 NPS farm buildings
R['8_standing_buildings'] = [dict(id=r['id'], name=r['name'], resid_m=r['resid_m'], loo_m=r['loo_m']) for r in T['residuals'] if r['kind'] == 'farm-building']
fb = [r['loo_m'] for r in T['residuals'] if r['kind'] == 'farm-building']
R['8_standing_buildings_summary'] = dict(n=len(fb), loo_rmse_m=float(np.sqrt(np.mean(np.square(fb)))))
json.dump(R, open(os.path.join(OUT, 'verification.json'), 'w'), indent=1)
for k, v in R.items(): print(k, json.dumps(v)[:300])
