"""Point-to-line ICP of modern road centrelines onto the ink of a Bachelder sheet (robust, affine)."""
import sys, os, json, math
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from autoreg import ink_map, MAPS
from autoreg2 import MAJOR
from common import *
from georef import *
from scipy.ndimage import map_coordinates
def line_samples(gj, namefilter, step_m=15.0):
    out = []   # (E, N, tx, ty) unit tangent in metres
    for f in gj['features']:
        if not namefilter(f['properties']): continue
        xy = [ll2m(*q[:2]) for q in f['geometry']['coordinates']]
        for i in range(len(xy) - 1):
            (x1, y1), (x2, y2) = xy[i], xy[i + 1]; L = math.hypot(x2 - x1, y2 - y1)
            if L < 1e-6: continue
            tx, ty = (x2 - x1) / L, (y2 - y1) / L
            n = max(1, int(L / step_m))
            for k in range(n):
                t = (k + .5) / n; out.append((x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, tx, ty, (f['properties'].get('name') or f['properties'].get('gnis_name') or '-')))
    return out
def measure(af, samples, inkb, half=16, prom=2.0):
    res = []
    M = af.M; ss = np.arange(-half, half + 1, 1.0)
    for (E, N, tx, ty, nm) in samples:
        p = M @ np.array([E, N, 1.0])
        tp = M[:, :2] @ np.array([tx, ty]); tp /= np.linalg.norm(tp); nrm = np.array([-tp[1], tp[0]])
        xs = p[0] + ss * nrm[0]; ys = p[1] + ss * nrm[1]
        prof = map_coordinates(inkb, [ys, xs], order=1, mode='constant', cval=0)
        k = int(np.argmax(prof)); pr = prof[k] - np.median(prof)
        # require interior peak
        if k in (0, len(ss) - 1) or pr < prom: continue
        res.append((E, N, p[0], p[1], nrm[0], nrm[1], ss[k], pr, nm))
    return res
def solve(af, meas, huber=5.0):
    # find affine update dM s.t. new px = M@[E,N,1] + [d]; want normal component of correction = s*
    # unknown 6 params of correction: px' = px + a*E' + b*N' + c (in local coordinates relative to centroid for conditioning)
    E0 = np.mean([m[0] for m in meas]); N0 = np.mean([m[1] for m in meas])
    A = []; y = []; w = []
    for (E, N, px, py, nx, ny, s, pr, nm) in meas:
        de, dn = E - E0, N - N0
        A.append([nx * de, nx * dn, nx, ny * de, ny * dn, ny]); y.append(s)
        w.append(1.0)
    A = np.array(A); y = np.array(y); w = np.array(w)
    for it in range(8):
        W = np.sqrt(w)[:, None]
        sol = np.linalg.lstsq(A * W, y * W[:, 0], rcond=None)[0]
        r = y - A @ sol; sc = max(1.5, 1.4826 * np.median(np.abs(r)))
        w = np.where(np.abs(r) <= huber, 1.0, huber / np.abs(r)) * (np.abs(r) < 3.5 * max(sc, 2))
    # sol maps to px correction: dx = a0*de + a1*dn + a2 ; dy = b0*de + b1*dn + b2
    a0, a1, a2, b0, b1, b2 = sol
    M = af.M.copy()
    # new px = M@[E,N,1] + [a0*(E-E0)+a1*(N-N0)+a2, b0*(E-E0)+b1*(N-N0)+b2]
    M[0, 0] += a0; M[0, 1] += a1; M[0, 2] += a2 - a0 * E0 - a1 * N0
    M[1, 0] += b0; M[1, 1] += b1; M[1, 2] += b2 - b0 * E0 - b1 * N0
    return Affine(M), r, w
if __name__ == '__main__':
    s = sys.argv[1]; niter = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    tf = json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', f'tf_{s}.json'))); af = Affine(tf['M'])
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    samples = line_samples(t, lambda p: (p['name'] or '') in MAJOR)
    ink = ink_map(s); inkb = cv2.GaussianBlur(ink, (0, 0), 2.5)
    print(len(samples), 'samples')
    for it in range(niter):
        meas = measure(af, samples, inkb)
        af, r, w = solve(af, meas)
        inl = w > 0.5
        print(it, 'n meas', len(meas), 'inliers', int(inl.sum()), 'rms resid px (inliers)', round(float(np.sqrt(np.mean(r[inl] ** 2))), 2), 'median abs', round(float(np.median(np.abs(r))), 2))
    meas = measure(af, samples, inkb)
    off = np.array([m[6] for m in meas]); print('final offsets: n', len(off), 'median', np.median(off), 'MAD', np.median(np.abs(off - np.median(off))), 'frac |s|<=3px', np.mean(np.abs(off) <= 3))
    json.dump({'M': af.M.tolist(), 'method': 'robust point-to-line ICP of TIGER major roads on Bachelder ink'}, open(os.path.join(ROOT, 'tmp/b1863/roads', f'tf_icp_{s}.json'), 'w'))
    print(np.round(af.M, 6))
