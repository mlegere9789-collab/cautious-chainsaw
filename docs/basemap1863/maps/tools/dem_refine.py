"""Local alignment of the georeferenced Warren raster to DEM-derived contours by normalised cross-correlation of band-passed images
(windows of 500 m, search +-45 m).  Output: tmp/b1863/maps/ref/shifts.json = list of {e,n,dx,dy,peak,second}.
The Warren contour interval is 4 ft; the DEM contour image uses 1.2192 m with vertical offset unknown, so the correlation uses a band-passed
*density* of contour ink (low-frequency content of the line density) as well as line shape."""
import sys, os, json, numpy as np, cv2, rasterio
from rasterio.windows import Window
from scipy import ndimage as ndi
from common import *
cv2.setNumThreads(3)
mid = sys.argv[1] if len(sys.argv) > 1 else 'warren-1869'
W = 500; R = 45
def rd(p, band, e0, n0, w, h):
    with rasterio.open(p) as ds:
        T = ds.transform; return ds.read(band, window=Window(int(e0 - T.c), int(T.f - n0 - h), w, h), boundless=True, fill_value=0)
def prepare(a, s1=1.5, s2=12):
    a = a.astype(np.float32); return ndi.gaussian_filter(a, s1) - ndi.gaussian_filter(a, s2)
out = []
dem = os.path.join(TMP, 'ref', 'dem_1m.tif'); mp = os.path.join(TMP, 'georef', mid + '.tif')
step = 400
for n0 in range(4406000, 4414600, step):
    for e0 in range(304000, 312200, step):
        pad = R + 10
        z = rd(dem, 1, e0 - pad, n0 - pad, W + 2 * pad, W + 2 * pad)
        if np.isnan(z).mean() > 0.01: continue
        ct = rd(os.path.join(TMP, 'ref', 'ct_1m.tif'), 1, e0 - pad, n0 - pad, W + 2 * pad, W + 2 * pad)
        ink_r = [rd(mp, b, e0, n0, W, W).astype(np.float32) for b in (1, 2, 3)]; al = rd(mp, 4, e0, n0, W, W)
        if (al > 0).mean() < 0.95: continue
        ink = 255 - np.mean(ink_r, 0)
        # focus on contour ink: dark thin lines; remove paper tone via bandpass
        t = prepare(ink); c = prepare(255 - ct.astype(np.float32))
        t = t - t.mean(); r = cv2.matchTemplate(c, t[None][0][R:-R or None, R:-R or None] if False else t, cv2.TM_CCOEFF_NORMED)
        # r has shape (2*pad+1 ... ) -> we padded by pad=R+10, template W; result size (2*pad+1)
        cy, cx = pad, pad
        sub = r[cy - R:cy + R + 1, cx - R:cx + R + 1]
        iy, ix = np.unravel_index(sub.argmax(), sub.shape); pk = float(sub.max())
        s2 = sub.copy(); s2[max(0, iy - 6):iy + 7, max(0, ix - 6):ix + 7] = -1
        out.append(dict(e=e0 + W / 2, n=n0 + W / 2, dx=int(ix - R), dy=int(R - iy), peak=round(pk, 3), second=round(float(s2.max()), 3)))
        print(out[-1], flush=True)
json.dump(out, open(os.path.join(TMP, 'ref', 'shifts_%s.json' % mid), 'w'))
