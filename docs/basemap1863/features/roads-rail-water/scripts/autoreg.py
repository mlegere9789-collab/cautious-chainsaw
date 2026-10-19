"""Auto-registration of a Bachelder sheet to modern road centrelines (ink-along-road maximisation)."""
import sys, os, json, math
import numpy as np, cv2, psutil
from scipy.ndimage import map_coordinates, gaussian_filter
from scipy.optimize import minimize
try: psutil.Process().nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
except Exception: pass
cv2.setNumThreads(4)
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from georef import *
MAPS = os.path.join(ROOT, 'tmp', 'b1863', 'roads', 'maps')
def ink_map(s):
    g = cv2.imread(os.path.join(MAPS, f'bach1879_{s}.50.jpg'), cv2.IMREAD_GRAYSCALE).astype(np.float32)
    bg = cv2.GaussianBlur(g, (0, 0), 25)
    ink = np.clip(bg - g, 0, None)
    return ink
def sample_points(gj, step=8.0, namefilter=None):
    pts = []; wts = []
    for f in gj['features']:
        p = f['properties']
        if namefilter and not namefilter(p): continue
        c = f['geometry']['coordinates']; xy = [ll2m(*q[:2]) for q in c]
        for i in range(len(xy) - 1):
            (x1, y1), (x2, y2) = xy[i], xy[i + 1]; L = math.hypot(x2 - x1, y2 - y1); n = max(1, int(L / step))
            for k in range(n): t = k / n; pts.append((x1 + (x2 - x1) * t, y1 + (y2 - y1) * t))
    return np.array(pts)
def score(M, pts, inkb):
    px = M[0, 0] * pts[:, 0] + M[0, 1] * pts[:, 1] + M[0, 2]; py = M[1, 0] * pts[:, 0] + M[1, 1] * pts[:, 1] + M[1, 2]
    v = map_coordinates(inkb, [py, px], order=1, mode='constant', cval=0)
    return v.mean()
def optimise(af0, pts, ink, sigmas=(8, 4, 2)):
    M0 = af0.M.copy()
    # centre offsets for conditioning
    c = pts.mean(axis=0)
    def mk(p):
        M = M0.copy()
        M[0, 0] *= (1 + p[2]); M[1, 1] *= (1 + p[3]); M[0, 1] += p[4] * abs(M0[0, 0]); M[1, 0] += p[5] * abs(M0[1, 1])
        M[0, 2] += p[0]; M[1, 2] += p[1]
        return M
    p = np.zeros(6)
    for sg in sigmas:
        inkb = cv2.GaussianBlur(ink, (0, 0), sg)
        scale = [20 * 1.0, 20, 0.01, 0.01, 0.01, 0.01]
        f = lambda q: -score(mk(q), pts, inkb)
        steps = np.array([6, 6, .004, .004, .004, .004]) * (sg / 4)
        best = f(p)
        for it in range(40):
            improved = False
            for i in range(6):
                for d in (+1, -1):
                    q = p.copy(); q[i] += d * steps[i]; v = f(q)
                    if v < best - 1e-9: p, best, improved = q, v, True
            if not improved: steps *= 0.5
            if steps[0] < 0.05: break
        print('sigma', sg, 'score', -best, 'params', np.round(p, 4))
    return Affine(mk(p))
if __name__ == '__main__':
    s = sys.argv[1]
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    keep = lambda p: p['mtfcc'] in ('S1100', 'S1200') or (p['mtfcc'] == 'S1400' and p['name'] and p['name'] not in ('',) )
    pts = sample_points(t, 6.0, lambda p: p['mtfcc'] in ('S1200', 'S1400') and not any(k in (p['name'] or '') for k in ('Hwy 15', 'US Hwy 15')))
    print(len(pts), 'sample points')
    from overlay import INIT
    ink = ink_map(s)
    af = initial(INIT[s])
    print('initial score', score(af.M, pts, cv2.GaussianBlur(ink, (0, 0), 3)))
    af2 = optimise(af, pts, ink)
    json.dump({'M': af2.M.tolist(), 'method': 'ink-along-road maximisation (preliminary)'}, open(os.path.join(ROOT, 'tmp/b1863/roads', f'tf_auto_{s}.json'), 'w'))
    print(af2.M)
