"""Derived-map transforms: scan px -> Warren px by thin-plate spline on thinned SIFT/hand pairs, then Warren affine to ground.
write_derived(mid, title, url, reg_json, smooth) -> transforms/<mid>.json (committed; includes thinned control pairs and measured CV);
rasterize(mid) -> tmp/b1863/maps/georef/<mid>.tif"""
import sys, os, json, numpy as np, cv2, rasterio
from rasterio.transform import from_origin
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
cv2.setNumThreads(3)
from common import *
import georef
OUTT = os.path.join(OUT, 'transforms')
def thin(a, r, cell=140):
    key = {}
    for i, p in enumerate(a):
        k = (int(p[0] // cell), int(p[1] // cell)); key.setdefault(k, i)
    return np.array(sorted(key.values()))
def write_derived(mid, title, url, regp, smooth=3.0, scan=None, extra=None):
    reg = json.load(open(regp)); a = np.array(reg['pairs']['a']); r = np.array(reg['pairs']['r'])
    W = json.load(open(os.path.join(OUTT, 'warren-1869.json')))
    # CV on all pairs with the thinned-model recipe
    rng = np.random.default_rng(1); idx = rng.permutation(len(a)); folds = np.array_split(idx, 5); err = []
    kind = 'tps' if len(a) >= 40 else 'affine'
    for f in folds:
        tr = np.setdiff1d(idx, f); t2 = tr[thin(a[tr], r[tr])]
        m = georef.Model(kind, smooth).fit(a[t2], r[t2]); err += list(np.linalg.norm(m(a[f]) - r[f], axis=1))
    cv = float(np.sqrt(np.mean(np.square(err)))); cvm = float(np.median(err))
    t = thin(a, r)
    out = dict(map_id=mid, title=title, loc_item=url, scan=scan or reg['scan'], crs=CRS, model=('thin-plate spline' if kind == 'tps' else 'affine') + ' scan->Warren px on thinned feature pairs, then Warren affine',
               control_pairs=dict(scan_px=a[t].round(1).tolist(), warren_px=r[t].round(1).tolist(), smoothing=smooth, kernel='thin_plate_spline', normalisation='z=(p-mean)/mean(std) of scan px'),
               warren_px_to_en=W['px_to_en'], affine_scan_to_warren=reg['A'],
               accuracy=dict(method=reg.get('method', 'SIFT matches to Warren scan'), n_pairs=int(len(a)), n_control=int(len(t)), relative_cv_rmse_m=round(cv, 2), relative_cv_median_m=round(cvm, 2), affine_only_rmse_m=round(reg['rms_px'], 2),
                             absolute_note='plus Warren absolute error: leave-one-out RMSE %.1f m (n=%d GCPs)' % (W['accuracy']['loo_rmse_m'], W['n_gcps'])))
    if extra: out.update(extra)
    json.dump(out, open(os.path.join(OUTT, mid + '.json'), 'w'), indent=1); print(mid, out['accuracy'])
def warren_px_to_scan_grid(T, step=40, size=(8878, 9845)):
    cp = T['control_pairs']; a = np.array(cp['scan_px']); r = np.array(cp['warren_px'])
    kind = 'tps' if len(a) >= 40 else 'affine'
    m = georef.Model(kind, cp['smoothing']).fit(r, a)    # inverse direction: warren px -> scan px
    gx = np.arange(0, size[0] + step, step, dtype=float); gy = np.arange(0, size[1] + step, step, dtype=float)
    G = np.stack(np.meshgrid(gx, gy), -1).reshape(-1, 2); P = m(G).reshape(len(gy), len(gx), 2)
    return gx, gy, P
def rasterize(mid, step=1.0):
    T = json.load(open(os.path.join(OUTT, mid + '.json')))
    A = np.array(T['warren_px_to_en']['A']); t = np.array(T['warren_px_to_en']['t']); Ai = np.linalg.inv(A)
    W = int((AOI['e1'] - AOI['e0']) / step); H = int((AOI['n1'] - AOI['n0']) / step)
    scan = np.array(Image.open(os.path.join(TMP, 'scans', T['scan'])).convert('RGB'))
    # dense: for each output px -> EN -> warren px (affine inverse) -> scan px (TPS evaluated on a coarse grid, bilinear upsampled)
    cols = AOI['e0'] + np.arange(W) * step; rows = AOI['n1'] - np.arange(H) * step
    # warren px coordinates on a coarse output grid
    cs = 32; ci = np.arange(0, W + cs, cs); ri = np.arange(0, H + cs, cs)
    E, N = np.meshgrid(AOI['e0'] + ci * step, AOI['n1'] - ri * step)
    wp = np.einsum('ij,jhw->ihw', Ai, np.stack([E - t[0], N - t[1]]))     # (2,h,w) warren px
    cp = T['control_pairs']; a = np.array(cp['scan_px']); r = np.array(cp['warren_px'])
    kind = 'tps' if len(a) >= 40 else 'affine'
    m = georef.Model(kind, cp['smoothing']).fit(r, a)
    sp = m(np.stack([wp[0].ravel(), wp[1].ravel()], 1)).reshape(wp.shape[1], wp.shape[2], 2)
    Mup = np.array([[1.0 / cs, 0, 0], [0, 1.0 / cs, 0]])
    mapx = cv2.warpAffine(sp[:, :, 0].astype(np.float32), Mup, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    mapy = cv2.warpAffine(sp[:, :, 1].astype(np.float32), Mup, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    out = cv2.remap(scan, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    mask = cv2.remap(np.full(scan.shape[:2], 255, np.uint8), mapx, mapy, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    os.makedirs(os.path.join(TMP, 'georef'), exist_ok=True); p = os.path.join(TMP, 'georef', mid + '.tif')
    with rasterio.open(p, 'w', driver='GTiff', width=W, height=H, count=4, dtype='uint8', crs=CRS, transform=from_origin(AOI['e0'], AOI['n1'], step, step), compress='deflate', tiled=True, photometric='RGB', alpha='YES') as ds:
        ds.write(out.transpose(2, 0, 1), indexes=[1, 2, 3]); ds.write(mask, 4)
    print(mid, p)
