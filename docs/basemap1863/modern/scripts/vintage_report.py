"""Compare the NAIP vintages over the AOI from the 2.4 m survey mosaics (tmp/b1863/modern/survey, made by survey.py) and measure
the colour step across quad edges in the chosen mosaic. Writes results/vintages.json.
Uses: catalog_pc_naip.json (STAC search of the Planetary Computer NAIP collection, a public mirror of USDA NAIP)."""
import json, os, sys, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aoi_util as A
ROOT = A.ROOT
MOD = os.path.join(ROOT, 'tmp', 'b1863', 'modern')
cat = json.load(open(os.path.join(MOD, 'catalog_pc_naip.json'), encoding='utf8'))['features']
b = A.utm_bounds(); RES = 2.4
out = {}
for k, tag in [('2010', '20100703'), ('2013', '20130604'), ('2015', '20150504'), ('2017', '2017051'), ('2019', '20190927'), ('2022', '2022')]:
    p = os.path.join(MOD, 'survey', f'{k}_2p4m.npy')
    if not os.path.exists(p):
        continue
    a = np.load(p).astype(np.float32); v = np.load(os.path.join(MOD, 'survey', f'{k}_valid.npy'))
    r, g, bl, n = a
    lum = 0.299 * r + 0.587 * g + 0.114 * bl
    ndvi = (n - r) / (n + r + 1e-3)
    mx = a[:3].max(0); mn = a[:3].min(0); sat = (mx - mn) / (mx + 1e-3)
    sc = [f for f in cat if tag in f['id']]
    dates = sorted({f['properties']['datetime'][:10] for f in sc})
    # shadow fraction: pixels darker than 35 percent of the local (31 px = 74 m) mean luminance; haze = 5th percentile of luminance (darkest tones lifted by haze)
    import cv2
    ctx = cv2.blur(lum, (31, 31))
    dark = float(((lum < 0.35 * ctx) & v).mean())
    # seam steps: for every quad edge inside the AOI, mean |colour difference| of the 20 px strips either side, per channel mean, compared with the same statistic for random vertical lines
    steps = []
    for f in sc:
        x0, y0, x1, y1 = f['properties']['proj:bbox']
        for xe in (x0, x1):
            c = int(round((xe - b[0]) / RES))
            if 30 < c < a.shape[2] - 30:
                for rr in range(0, a.shape[1] - 400, 400):
                    L, R = a[:3, rr:rr + 400, c - 20:c - 2], a[:3, rr:rr + 400, c + 2:c + 20]
                    if (L.max(0) > 0).all() and (R.max(0) > 0).all():
                        steps.append(abs(float(lum[rr:rr + 400, c - 20:c - 2].mean() - lum[rr:rr + 400, c + 2:c + 20].mean())))
    ctrl = []
    rng = np.random.default_rng(1)
    for _ in range(300):
        c = int(rng.integers(40, a.shape[2] - 40)); rr = int(rng.integers(0, a.shape[1] - 400))
        ctrl.append(abs(float(lum[rr:rr + 400, c - 20:c - 2].mean() - lum[rr:rr + 400, c + 2:c + 20].mean())))
    out[k] = dict(flight_dates=dates, gsd_m=sorted({f['properties']['gsd'] for f in sc}), scenes=len(sc), coverage_of_AOI=round(float(v.mean()), 4),
                  mean_luminance=round(float(lum[v].mean()), 1), p5_luminance=round(float(np.percentile(lum[v], 5)), 1),
                  mean_saturation=round(float(sat[v].mean()), 3), ndvi_mean=round(float(ndvi[v].mean()), 3), ndvi_gt_0p3_fraction=round(float((ndvi[v] > 0.3).mean()), 3),
                  shadow_fraction=round(dark, 4),
                  mean_green_over_red=round(float((g[v] / (r[v] + 1)).mean()), 3),
                  quad_edge_luminance_step_median=round(float(np.median(steps)), 2) if steps else None,
                  quad_edge_step_p90=round(float(np.percentile(steps, 90)), 2) if steps else None,
                  random_line_step_median=round(float(np.median(ctrl)), 2), n_edge_samples=len(steps))
json.dump(out, open(os.path.join(ROOT, 'docs', 'basemap1863', 'modern', 'results', 'vintages.json'), 'w'), indent=1)
for k, v in out.items():
    print(k, v)
