"""Removal-method test on 20 real sample masks (scripts/inpaint_methods.py: telea, ns, exemplar).

For every sample site a 256 x 256 m window (1 m px) of the 2013 base and the patch-removal mask (classes 1,2,3,4,6 of removal_mask_1m.tif) is cut.
 (a) REAL: the three methods fill the real mask. Before/after strips are written to previews/ and LOOKED AT. Seam metric:
       seam_ratio = mean gradient magnitude on a 3 px band straddling the mask boundary after filling
                    / mean gradient magnitude on the same band shape translated to a clean place in the same window (the control).
       1.0 = the boundary is as busy as ordinary ground, > 1.3 = a visible seam. Also tex_ratio = Laplacian variance inside the fill / in a 6 px ring outside it
       (1.0 = same grain; << 1 = blurred; >> 1 = invented detail).
 (b) TRUTH: the same mask shape is moved onto clean ground (>= 40 m from any mask pixel, same window or a neighbour, similar mean NDVI), the method fills it and
       the result is compared with the real, untouched pixels: PSNR and SSIM inside the mask's bounding box, tex_ratio, and the Jensen-Shannon distance between the
       gradient-magnitude histograms of fill and truth (low = same grain). PSNR rewards blur, so it is never read alone.
Run:  PYTHONUTF8=1 python inpaint_test.py        (about 10-15 min at below-normal priority)
"""
import os, sys, json, time, pickle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, rasterio, cv2
from rasterio.windows import Window
from skimage.metrics import structural_similarity as ssim
from scipy.spatial.distance import jensenshannon
import aoi_util as A
import inpaint_methods as IM

ROOT = A.ROOT
MOD = os.path.join(ROOT, 'tmp', 'b1863', 'modern'); WORK = os.path.join(MOD, 'work')
OUT = os.path.join(ROOT, 'docs', 'basemap1863', 'modern')
PREV = os.path.join(OUT, 'previews'); os.makedirs(PREV, exist_ok=True)
SZ = 256
ds = rasterio.open(os.path.join(WORK, 'naip2013_1.0m.tif')); dm = rasterio.open(os.path.join(WORK, 'removal_mask_1m.tif'))
recs = pickle.load(open(os.path.join(WORK, 'inventory_utm.pkl'), 'rb'))
x0, y1 = ds.bounds.left, ds.bounds.top
PATCH = (1, 2, 3, 4, 6)


def window_at(x, y):
    c = int((x - x0) - SZ // 2); r = int((y1 - y) - SZ // 2)
    c = min(max(c, 0), ds.width - SZ); r = min(max(r, 0), ds.height - SZ)
    return Window(c, r, SZ, SZ)


def read(win):
    img = np.moveaxis(ds.read([1, 2, 3], window=win), 0, 2).copy()
    m = np.isin(dm.read(1, window=win), PATCH)
    return img, m


def grad(img):
    g = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32)
    return np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3))


def lapvar(img, m):
    g = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32)
    L = cv2.Laplacian(g, cv2.CV_32F, ksize=3)
    return float(L[m].var()) if m.sum() > 8 else float('nan')


def seam_ratio(out, m):
    k = np.ones((3, 3), np.uint8)
    band = (cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)) - cv2.erode(m.astype(np.uint8), np.ones((5, 5), np.uint8))).astype(bool)
    G = grad(out)
    if band.sum() < 10:
        return float('nan')
    sb = G[band].mean()
    # control: the same band shape moved to clean places, best of 40 random translations that stay clean
    rng = np.random.default_rng(5)
    clean = ~cv2.dilate(m.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)
    ys, xs = np.nonzero(band)
    vals = []
    for _ in range(300):
        dy = int(rng.integers(-90, 91)); dx = int(rng.integers(-90, 91))
        yy, xx = ys + dy, xs + dx
        if yy.min() < 2 or xx.min() < 2 or yy.max() >= SZ - 2 or xx.max() >= SZ - 2:
            continue
        if not clean[yy, xx].all():
            continue
        vals.append(G[yy, xx].mean())
        if len(vals) >= 12:
            break
    return float(sb / np.mean(vals)) if vals else float('nan')


def tex_ratio(out, m):
    ring = cv2.dilate(m.astype(np.uint8), np.ones((13, 13), np.uint8)).astype(bool) & ~cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    a, b = lapvar(out, m), lapvar(out, ring)
    return float(a / b) if b and b > 0 else float('nan')


def js_grad(a, b, m):
    ha, _ = np.histogram(grad(a)[m], bins=24, range=(0, 240)); hb, _ = np.histogram(grad(b)[m], bins=24, range=(0, 240))
    return float(jensenshannon(ha + 1e-9, hb + 1e-9))


# ---- choose 20 sites: fixed list of (label, picker) over inventory classes, deterministic
def pick(cls, k, cond=None):
    rs = [r for r in recs if r['cls'] == cls and (cond is None or cond(r))]
    rs.sort(key=lambda r: r['id'])
    return rs[k % len(rs)] if rs else None


SITES = [
    ('arterial_road_A', 'ROAD_ARTERIAL', 3, lambda r: r['geom'].length > 400),
    ('arterial_road_B', 'ROAD_ARTERIAL', 40, lambda r: r['geom'].length > 400),
    ('local_road_field', 'ROAD_LOCAL', 11, lambda r: r['geom'].length > 400),
    ('local_road_town', 'ROAD_LOCAL', 500, lambda r: r['geom'].length > 150),
    ('service_drive_A', 'ROAD_SERVICE', 20, lambda r: r['geom'].length > 150),
    ('service_drive_B', 'ROAD_SERVICE', 700, lambda r: r['geom'].length > 150),
    ('parking_large', 'PARKING', 0, lambda r: r['geom'].area > 6000),
    ('parking_small', 'PARKING', 5, lambda r: 800 < r['geom'].area < 3000),
    ('path_trail', 'PATH', 30, lambda r: r['geom'].length > 200),
    ('rail_line', 'RAIL', 4, lambda r: r['geom'].length > 400),
    ('building_farm_A', 'BUILDING', 100, lambda r: 150 < r['geom'].area < 600 and r['src'] == 'ADAMS'),
    ('building_farm_B', 'BUILDING', 900, lambda r: 150 < r['geom'].area < 600 and r['src'] == 'ADAMS'),
    ('building_large', 'BUILDING', 3, lambda r: r['geom'].area > 3000),
    ('building_town', 'BUILDING', 7000, lambda r: 100 < r['geom'].area < 400),
    ('monument_A', 'MONUMENT', 5, None),
    ('monument_B', 'MONUMENT', 300, None),
    ('monument_C', 'MONUMENT', 650, None),
    ('pylon', 'POWER_SUPPORT', 40, lambda r: True),
    ('tower_comm', 'TOWER_COMM', 3, None),
    ('airfield_apron', 'AIRFIELD', 10, lambda r: r['geom'].area > 500),
]
rows = []
summ = {}
t_all = time.time()
for name, cls, k, cond in SITES:
    r = pick(cls, k, cond)
    if r is None:
        print('no record for', name); continue
    c = r['geom'].centroid
    win = window_at(c.x, c.y)
    img, m = read(win)
    if m.sum() < 15:
        # try neighbours of the same class until the window really contains mask pixels
        for kk in range(k + 1, k + 40):
            r2 = pick(cls, kk, cond)
            if r2 is None:
                break
            c = r2['geom'].centroid; win = window_at(c.x, c.y); img, m = read(win)
            if m.sum() >= 40:
                r = r2; break
    if m.sum() < 15:
        print(name, 'mask too small', int(m.sum())); continue
    res = dict(site=name, cls=cls, feature=r['id'], x=round(c.x, 1), y=round(c.y, 1), mask_px=int(m.sum()), mask_frac=round(float(m.mean()), 3))
    outs = {}
    for mn, fn in IM.METHODS.items():
        t = time.time(); out = fn(img, m); dt = time.time() - t
        outs[mn] = out
        res[mn] = dict(seconds=round(dt, 2), seam_ratio=round(seam_ratio(out, m), 2), tex_ratio=round(tex_ratio(out, m), 2))
    # truth test: move the mask shape onto clean ground
    rng = np.random.default_rng(11)
    ys, xs = np.nonzero(m); bh0, bh1, bw0, bw1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    shape = m[bh0:bh1, bw0:bw1]
    big = ds.read([1, 2, 3, 4], window=Window(max(win.col_off - 300, 0), max(win.row_off - 300, 0), min(SZ + 600, ds.width), min(SZ + 600, ds.height)))
    bigm = np.isin(dm.read(1, window=Window(max(win.col_off - 300, 0), max(win.row_off - 300, 0), min(SZ + 600, ds.width), min(SZ + 600, ds.height))), PATCH + (5, 7))
    bigi = np.moveaxis(big[:3], 0, 2).copy()
    ndvi = (big[3].astype(np.float32) - big[0]) / (big[3].astype(np.float32) + big[0] + 1e-3)
    clean = ~cv2.dilate(bigm.astype(np.uint8), np.ones((81, 81), np.uint8)).astype(bool)
    ref_ndvi = float(((ds.read(4, window=win).astype(np.float32) - ds.read(1, window=win)) / (ds.read(4, window=win).astype(np.float32) + ds.read(1, window=win) + 1e-3))[cv2.dilate(m.astype(np.uint8), np.ones((31, 31), np.uint8)).astype(bool) & ~m].mean())
    tests = []
    for _ in range(4000):
        if len(tests) >= 5: break
        ty = int(rng.integers(40, big.shape[1] - SZ + 0)) if big.shape[1] > SZ + 80 else None
        tx = int(rng.integers(40, big.shape[2] - SZ + 0)) if big.shape[2] > SZ + 80 else None
        if ty is None or tx is None: break
        tw = (ty, tx)
        cwin = clean[ty:ty + SZ, tx:tx + SZ]
        if cwin.shape != (SZ, SZ) or not cwin.all():
            continue
        nd = float(ndvi[ty:ty + SZ, tx:tx + SZ].mean())
        if abs(nd - ref_ndvi) > 0.08:
            continue
        tests.append(tw)
    truth = {mn: [] for mn in IM.METHODS}
    for (ty, tx) in tests:
        timg = bigi[ty:ty + SZ, tx:tx + SZ].copy()
        py, px = SZ // 2 - (bh1 - bh0) // 2, SZ // 2 - (bw1 - bw0) // 2
        tmask = np.zeros((SZ, SZ), bool); tmask[py:py + bh1 - bh0, px:px + bw1 - bw0] = shape
        for mn, fn in IM.METHODS.items():
            o = fn(timg, tmask)
            sl = (slice(py, py + bh1 - bh0), slice(px, px + bw1 - bw0))
            mse = float(((o[sl].astype(np.float32) - timg[sl].astype(np.float32)) ** 2)[tmask[sl]].mean())
            psnr = 10 * np.log10(255 ** 2 / max(mse, 1e-6))
            ss = float(ssim(cv2.cvtColor(timg[sl], cv2.COLOR_RGB2GRAY), cv2.cvtColor(o[sl], cv2.COLOR_RGB2GRAY), data_range=255)) if min(timg[sl].shape[:2]) >= 7 else float('nan')
            truth[mn].append(dict(psnr=psnr, ssim=ss, tex=tex_ratio(o, tmask), js=js_grad(o, timg, tmask), seam=seam_ratio(o, tmask)))
    res['truth_trials'] = len(tests)
    for mn in IM.METHODS:
        if truth[mn]:
            res[mn].update({f'truth_{k}': round(float(np.nanmean([t[k] for t in truth[mn]])), 3) for k in ('psnr', 'ssim', 'tex', 'js', 'seam')})
    rows.append(res)
    # preview strip: before | mask | telea | ns | exemplar, upscaled x2
    def up(a): return cv2.resize(a, (SZ * 2, SZ * 2), interpolation=cv2.INTER_NEAREST)
    mv = img.copy(); mv[m] = (0.5 * mv[m] + 0.5 * np.array([255, 0, 0])).astype(np.uint8)
    strip = np.concatenate([up(img), up(mv), up(outs['telea']), up(outs['ns']), up(outs['exemplar'])], axis=1)
    cv2.imwrite(os.path.join(PREV, f'{name}.jpg'), cv2.cvtColor(strip, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(name, res['mask_px'], {mn: (res[mn]['seam_ratio'], res[mn]['tex_ratio'], res[mn].get('truth_psnr')) for mn in IM.METHODS}, round(time.time() - t_all), 's', flush=True)

agg = {}
for mn in IM.METHODS:
    agg[mn] = {k: round(float(np.nanmean([r[mn][k] for r in rows if k in r[mn]])), 3) for k in ('seam_ratio', 'tex_ratio', 'truth_psnr', 'truth_ssim', 'truth_tex', 'truth_js', 'truth_seam', 'seconds')}
    agg[mn]['seam_ratio_median'] = round(float(np.nanmedian([r[mn]['seam_ratio'] for r in rows])), 3)
    agg[mn]['seam_visible_sites(>1.3)'] = int(sum(1 for r in rows if r[mn]['seam_ratio'] > 1.3))
json.dump(dict(n_sites=len(rows), window_m=SZ, mask_classes=list(PATCH), per_site=rows, aggregate_mean=agg), open(os.path.join(OUT, 'results', 'inpaint_test.json'), 'w'), indent=1)
print(json.dumps(agg, indent=1))
