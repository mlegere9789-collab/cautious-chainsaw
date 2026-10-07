"""End-to-end georeferencing check, step 2.  For every picture rendered by verify-render.mjs (the loader's own canvas pixels in real Chrome, raw look), request the SAME ground window
from the USGS NAIP service (exportImage, bbox in EPSG:3857, supersampled 2x and area-averaged) and measure the sub-pixel shift between the two by phase correlation of band-passed luminance.
The shift is the error of the whole chain (tile cutting, pyramid, manifest, loader maths, DPR) against the authoritative service, in metres on the ground (east/north positive).
Usage: python verify-georef.py   -> results/georef-e2e.json and a printout"""
import json, math, os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from common import *
from terrain import smooth, box_down
import numpy as np
from PIL import Image

NAIP = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage'
VER = os.path.join(ROOT, 'tmp', 'look-dev', 'basemap', 'verify')
sites = {s['id']: s for s in json.load(open(os.path.join(os.path.dirname(__file__), 'sites.json')))['sites']}


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def bandpass(a):
    return smooth(a, 1.2) - smooth(a, 9.0)


def phase_corr(a, b):
    """a(x) = b(x - s): returns (dx, dy, peak) in px, subpixel"""
    n = min(a.shape[0], a.shape[1], b.shape[0], b.shape[1])
    h = np.hanning(n)
    win = np.outer(h, h)
    a = a[:n, :n] * win
    b = b[:n, :n] * win
    F = np.fft.fft2(a) * np.conj(np.fft.fft2(b))
    F /= np.abs(F) + 1e-9
    r = np.real(np.fft.ifft2(F))
    iy, ix = np.unravel_index(np.argmax(r), r.shape)
    pk = r[iy, ix]

    def refine(m, i):
        l, c, rr = m[(i - 1) % n], m[i], m[(i + 1) % n]
        d = l - 2 * c + rr
        return 0.0 if abs(d) < 1e-12 else 0.5 * (l - rr) / d
    dx = ix + refine(r[iy, :], ix)
    dy = iy + refine(r[:, ix], iy)
    if dx > n / 2: dx -= n
    if dy > n / 2: dy -= n
    return dx, dy, float(pk)


rows = []
for fn in sorted(os.listdir(VER)):
    m = re.match(r'(.+)_z([\d.]+)_dpr(\d)\.png$', fn)
    if not m:
        continue
    sid, z, dpr = m.group(1), float(m.group(2)), int(m.group(3))
    s = sites[sid]
    img = Image.open(os.path.join(VER, fn)).convert('RGB')
    W = img.size[0]                                   # device px
    css = W / dpr
    cx, cy = lnglat_to_merc(s['lng'], s['lat'])
    half = css / 2 * mpp(z)                           # merc metres of half the window (mpp: merc metres per CSS px at zoom z)
    bbox = (cx - half, cy - half, cx + half, cy + half)
    req = W * 2
    p = polite_get(NAIP, dict(bbox='%.4f,%.4f,%.4f,%.4f' % bbox, bboxSR=3857, imageSR=3857, size=f'{req},{req}', format='png', pixelType='U8', interpolation='RSP_BilinearInterpolation',
                              renderingRule='{"rasterFunction":"None"}', f='image'), cache_key=f'verify/{sid}_z{z}_dpr{dpr}.png', min_interval=1.0)
    ref = box_down(np.asarray(Image.open(p).convert('RGB'), dtype=np.float32), 2)
    mine = np.asarray(img, dtype=np.float32)
    A, B = bandpass(lum(mine)), bandpass(lum(ref))
    c = 8                                              # drop the filter's edge
    A, B = A[c:-c, c:-c], B[c:-c, c:-c]
    dx, dy, pk = phase_corr(A, B)
    gm_per_px = mpp(z) / dpr * math.cos(math.radians(s['lat']))            # ground metres per device pixel
    rows.append(dict(site=sid, zoom=z, dpr=dpr, dx_px=round(dx, 3), dy_px=round(dy, 3), east_m=round(dx * gm_per_px, 3), north_m=round(-dy * gm_per_px, 3),
                     err_m=round(math.hypot(dx, dy) * gm_per_px, 3), peak=round(pk, 3), ground_m_per_px=round(gm_per_px, 3)))
    print(rows[-1], flush=True)
os.makedirs(os.path.join(os.path.dirname(__file__), 'results'), exist_ok=True)
good = [r for r in rows if r['peak'] >= 0.12]
summary = dict(n=len(rows), usable=len(good), mean_err_m=round(float(np.mean([r['err_m'] for r in good])), 3), max_err_m=round(max(r['err_m'] for r in good), 3),
               mean_east_m=round(float(np.mean([r['east_m'] for r in good])), 3), mean_north_m=round(float(np.mean([r['north_m'] for r in good])), 3),
               low_confidence=[r['site'] + '@z' + str(r['zoom']) + '/dpr' + str(r['dpr']) for r in rows if r['peak'] < 0.12])
print(summary)
json.dump(dict(summary=summary, rows=rows), open(os.path.join(os.path.dirname(__file__), 'results', 'georef-e2e.json'), 'w'), indent=1)
