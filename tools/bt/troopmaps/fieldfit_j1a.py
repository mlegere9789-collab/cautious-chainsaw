"""fieldfit_j1a.py : July 1 re-registration of Bachelder sheet 1 (cw0325000a). Starts from the roads-task base affine and displacement-field method
(docs/basemap1863/features/roads-rail-water/scripts/fieldfit.py: bilinear field on a 450 px grid at 50% render, smoothness-regularised, 1-D road-line constraints + 2-D control points)
and ADDS the hand-read surviving-building control points of hand_gt_a.json (2023 county outlines, independent of Warren and of TIGER).
Reports leave-one-out for every building point (the honest number for the July 1 ground) and writes terrain/troopmaps/transform_bachelder1876_sheet1_j1.json (field + base, with residuals).
Usage: python fieldfit_j1a.py [lam] [w_build_px50] [--nobuild]"""
import sys, os, json, math
import numpy as np
from scipy.sparse import lil_matrix, vstack, csr_matrix
from scipy.sparse.linalg import lsqr
from common_tm import *
import fieldmodel_a as FM
STEP = FM.STEP; nx, ny, x0, y0 = FM.nx, FM.ny, FM.x0, FM.y0; M = FM.M
LAM = float(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 25.0
WB = float(sys.argv[2]) if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else 1 / 5.0
def hat(x, y):
    gx = (x - x0) / STEP; gy = (y - y0) / STEP
    i = int(np.clip(math.floor(gx), 0, nx - 2)); j = int(np.clip(math.floor(gy), 0, ny - 2)); fx = gx - i; fy = gy - j
    return [(j * nx + i, (1 - fx) * (1 - fy)), (j * nx + i + 1, fx * (1 - fy)), ((j + 1) * nx + i, (1 - fx) * fy), ((j + 1) * nx + i + 1, fx * fy)]
S = SheetTransform('a'); G = {g['id']: g for g in json.load(open(os.path.join(os.path.dirname(__file__), 'gt_j1.json')))}
Hd = json.load(open(os.path.join(os.path.dirname(__file__), 'hand_gt_a.json')))
def observations(drop=(), build=True):
    obs = []
    px, en, g = warren_gcps(); sc = S.warren_to_scan(px) / 2.0
    for x, e, p in zip(g, en, sc):
        if x['id'] in drop: continue
        b = M @ np.array([e[0], e[1], 1.0]); obs.append(('g', b[0], b[1], 1, 0, p[0] - b[0], 1 / 8.0, x['id'])); obs.append(('g', b[0], b[1], 0, 1, p[1] - b[1], 1 / 8.0, x['id']))
    d = json.load(open(os.path.join(ROOT, 'docs/basemap1863/features/roads-rail-water/roadreads_a.json')))
    for r in d['reads']:
        if r['id'] in drop: continue
        b = M @ np.array([r['E'], r['N'], 1.0]); t = M[:, :2] @ np.array([r['tx'], r['ty']]); t /= np.linalg.norm(t); n = np.array([-t[1], t[0]])
        obs.append(('r', b[0], b[1], n[0], n[1], r['s_px'], 1 / 6.0, r['id']))
    if build:
        for p in Hd['points']:
            if p['gt'] in drop or p['gt'] in ('W014', 'W015') or not p.get('use', True): continue   # bridges are already Warren GCPs
            gg = G[p['gt']]; b = M @ np.array([gg['E'], gg['N'], 1.0]); a = np.array(p['scan_px'], float) / 2
            w = 1 / math.hypot(p['sigma_read_px'] / 2, gg['sigma_gt_m'] / 2.0, 1.0) if WB is None else min(WB, 1 / math.hypot(p['sigma_read_px'] / 2, gg['sigma_gt_m'] / 2.0))
            obs.append(('b', b[0], b[1], 1, 0, a[0] - b[0], w, p['gt'])); obs.append(('b', b[0], b[1], 0, 1, a[1] - b[1], w, p['gt']))
    return obs
def solve(obs, lam=LAM):
    N = nx * ny; A = lil_matrix((len(obs), 2 * N)); b = np.zeros(len(obs))
    for r, (k, px, py, a, bb, v, wt, _) in enumerate(obs):
        for kk, ww in hat(px, py): A[r, kk] = ww * a * wt; A[r, N + kk] = ww * bb * wt
        b[r] = v * wt
    R = lil_matrix((4 * N, 2 * N)); rr = 0
    for j in range(ny):
        for i in range(nx):
            kk = j * nx + i
            for (di, dj) in ((1, 0), (0, 1)):
                i0, j0, i2, j2 = i - di, j - dj, i + di, j + dj
                if 0 <= i0 and i2 < nx and 0 <= j0 and j2 < ny:
                    for off in (0, N): R[rr, off + kk] = -2 * lam * 0.05; R[rr, off + j0 * nx + i0] = lam * 0.05; R[rr, off + j2 * nx + i2] = lam * 0.05; rr += 1
    R = R[:rr]; Z = lil_matrix((2 * N, 2 * N)); Z.setdiag(0.02)
    sol = lsqr(vstack([csr_matrix(A), csr_matrix(R), csr_matrix(Z)]), np.concatenate([b, np.zeros(rr), np.zeros(2 * N)]), atol=1e-9, btol=1e-9, iter_lim=20000)[0]
    return sol[:N], sol[N:]
def disp(dx, dy, x, y): hw = hat(x, y); return sum(w * dx[k] for k, w in hw), sum(w * dy[k] for k, w in hw)
def resid(dx, dy, obs):
    return [(k, i, (a * disp(dx, dy, px, py)[0] + bb * disp(dx, dy, px, py)[1] - v) * 2.0) for (k, px, py, a, bb, v, wt, i) in obs]
if __name__ == '__main__':
    nob = '--nobuild' in sys.argv
    obs = observations(build=not nob); dx, dy = solve(obs); r = resid(dx, dy, obs)
    for kind, nm in (('g', 'GCP'), ('r', 'road'), ('b', 'building')):
        v = [x[2] for x in r if x[0] == kind]
        if v: print('fit', nm, 'n', len(v), 'rms m', round(float(np.sqrt(np.mean(np.square(v)))), 1))
    print('LAM', LAM, 'WB', WB)
    bl = sorted({o[7] for o in obs if o[0] == 'b'}); out = []
    for i in bl:
        o2 = observations(drop=(i,), build=not nob); dx2, dy2 = solve(o2)
        full = [o for o in observations(build=True) if o[7] == i]; res = resid(dx2, dy2, full)
        e = float(np.hypot(res[0][2], res[1][2])); out.append(e); print('LOO building', i, round(e, 1), 'm   fit (in sample):', round(float(np.hypot(*[x[2] for x in r if x[1] == i])), 1) if not nob else '')
    print('LOO buildings rms', round(float(np.sqrt(np.mean(np.square(out)))), 1), 'median', round(float(np.median(out)), 1))
    gl = sorted({o[7] for o in obs if o[0] == 'g'}); og = []
    for i in gl:
        o2 = observations(drop=(i,), build=not nob); dx2, dy2 = solve(o2)
        full = [o for o in observations(build=True) if o[7] == i]; res = resid(dx2, dy2, full); og.append(float(np.hypot(res[0][2], res[1][2])))
    print('LOO Warren GCPs rms', round(float(np.sqrt(np.mean(np.square(og)))), 1), 'median', round(float(np.median(og)), 1), 'max', round(max(og), 1))
