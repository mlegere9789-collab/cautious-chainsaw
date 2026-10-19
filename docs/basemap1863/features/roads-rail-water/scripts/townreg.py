"""Register the 1863 town street grid (Bachelder sheet) to modern TIGER streets: street gaps are bright between dark house blocks."""
import sys, os, json, math
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from icp import *
def town_samples(t):
    keep = lambda p: p['mtfcc'] in ('S1200', 'S1400') and 'Aly' not in (p['name'] or '') and 'Cir' not in (p['name'] or '') and 'Dr' not in (p['name'] or '')
    out = []
    for (E, N, tx, ty, nm) in line_samples(t, keep, step_m=6.0):
        lng, lat = m2ll(E, N)
        if -77.2385 <= lng <= -77.2215 and 39.8272 <= lat <= 39.8345: out.append((E, N, tx, ty, nm))
    return out
def obj(M, samples, g, off=9.0):
    sc = 0.0; n = 0
    P = np.array([[s[0], s[1]] for s in samples]); T = np.array([[s[2], s[3]] for s in samples])
    px = M[0, 0] * P[:, 0] + M[0, 1] * P[:, 1] + M[0, 2]; py = M[1, 0] * P[:, 0] + M[1, 1] * P[:, 1] + M[1, 2]
    tx = M[0, 0] * T[:, 0] + M[0, 1] * T[:, 1]; ty = M[1, 0] * T[:, 0] + M[1, 1] * T[:, 1]
    L = np.hypot(tx, ty); nx = -ty / L; ny = tx / L
    c = map_coordinates(g, [py, px], order=1); a = map_coordinates(g, [py + off * ny, px + off * nx], order=1); b = map_coordinates(g, [py - off * ny, px - off * nx], order=1)
    return float(np.mean(c - 0.5 * (a + b)))
if __name__ == '__main__':
    s = sys.argv[1]
    g = cv2.GaussianBlur(cv2.imread(os.path.join(MAPS, f'bach1879_{s}.50.jpg'), cv2.IMREAD_GRAYSCALE).astype(np.float32), (0, 0), 1.2)
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    samples = town_samples(t); print(len(samples), 'town street samples')
    from overlay import INIT
    dx0, dy0 = INIT[s]
    e0, n0 = ll2m(-77.230932, 39.830931)
    def mk(sc_, th, ddx, ddy):
        r = math.radians(th); k = 1 / sc_; c, sn = math.cos(r), math.sin(r)
        M = np.array([[k * c, k * sn, 0.0], [k * sn, -k * c, 0.0]])
        M[0, 2] = dx0 + ddx - (M[0, 0] * e0 + M[0, 1] * n0); M[1, 2] = dy0 + ddy - (M[1, 0] * e0 + M[1, 1] * n0)
        return M
    best = []
    for sc_ in np.arange(1.94, 2.12, 0.02):
        for th in np.arange(-6, 6.01, 0.5):
            for ddx in range(-16, 17, 4):
                for ddy in range(-16, 17, 4):
                    best.append((obj(mk(sc_, th, ddx, ddy), samples, g), sc_, th, ddx, ddy))
    best.sort(reverse=True); print(best[:8])
    # local refinement
    v, sc_, th, ddx, ddy = best[0]
    for stp in (1.0, 0.5, 0.25):
        for it in range(30):
            imp = False
            for (a, b, c_, d) in [(0.005, 0, 0, 0), (0, stp * .2, 0, 0), (0, 0, stp, 0), (0, 0, 0, stp)]:
                for sg in (1, -1):
                    cand = (sc_ + sg * a, th + sg * b, ddx + sg * c_, ddy + sg * d)
                    vv = obj(mk(*cand), samples, g)
                    if vv > v + 1e-6: v, (sc_, th, ddx, ddy), imp = vv, cand, True
            if not imp: break
    print('refined', v, sc_, th, ddx, ddy)
    M = mk(sc_, th, ddx, ddy)
    json.dump({'M': M.tolist(), 'method': 'town street-gap registration', 'scale': sc_, 'rot': th}, open(os.path.join(ROOT, 'tmp/b1863/roads', f'tf_town_{s}.json'), 'w'))
