"""Double-line road detector + robust affine ICP on a Bachelder sheet."""
import sys, os, json, math
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from icp import *
def measure2(af, samples, inkb, half=18, widths=(4, 5, 6, 7, 8, 10), thresh=3.0):
    M = af.M; ss = np.arange(-half, half + 1, 1.0); taus = np.arange(-9, 10, 3.0)
    res = []
    for (E, N, tx, ty, nm) in samples:
        p = M @ np.array([E, N, 1.0])
        tp = M[:, :2] @ np.array([tx, ty]); tp /= np.linalg.norm(tp); nrm = np.array([-tp[1], tp[0]])
        X = p[0] + taus[:, None] * tp[0] + ss[None, :] * nrm[0]; Y = p[1] + taus[:, None] * tp[1] + ss[None, :] * nrm[1]
        v = map_coordinates(inkb, [Y.ravel(), X.ravel()], order=1, mode='constant', cval=0).reshape(X.shape)
        # for pair detection require each line present along most of the tangent extent: use 30th percentile along tau
        prof = np.percentile(v, 30, axis=0)
        best = (-1, 0, 0)
        for w in widths:
            h = w / 2.0
            for i, s in enumerate(ss):
                a = np.interp(s - h, ss, prof); b = np.interp(s + h, ss, prof)
                sc = min(a, b)
                if sc > best[0]: best = (sc, s, w)
        base = np.median(prof)
        if best[0] - base < thresh or abs(best[1]) >= half - 1: continue
        res.append((E, N, p[0], p[1], nrm[0], nrm[1], best[1], best[0] - base, nm))
    return res
if __name__ == '__main__':
    s = sys.argv[1]; niter = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    src = sys.argv[3] if len(sys.argv) > 3 else f'tf_{s}.json'
    tf = json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', src))); af = Affine(tf['M'])
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    samples = line_samples(t, lambda p: (p['name'] or '') in MAJOR, step_m=25.0)
    ink = ink_map(s); inkb = cv2.GaussianBlur(ink, (0, 0), 1.2)
    print(len(samples), 'samples')
    for it in range(niter):
        meas = measure2(af, samples, inkb)
        off = np.array([m[6] for m in meas])
        print(it, 'n', len(meas), 'median off', round(float(np.median(off)), 2), 'MAD', round(float(np.median(np.abs(off - np.median(off)))), 2), 'frac<=3', round(float(np.mean(np.abs(off) <= 3)), 3))
        af, r, w = solve(af, meas)
    json.dump({'M': af.M.tolist(), 'method': 'double-line road ICP'}, open(os.path.join(ROOT, 'tmp/b1863/roads', f'tf_icp2_{s}.json'), 'w'))
    print(np.round(af.M, 6))
