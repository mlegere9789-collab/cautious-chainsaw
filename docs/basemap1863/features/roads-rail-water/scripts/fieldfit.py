"""Smooth displacement field over the b-maps affine (tf_bm1): constraints = Warren GCPs (2-D, sigma 8 px) + hand-read road lines (1-D, sigma 6 px) + smoothness. LOO reported."""
import sys, os, json, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from fieldreg import Field, hat_weights, STEP
import fieldreg
from common import *
from georef import *
import tps
from scipy.sparse import lil_matrix, vstack, csr_matrix
from scipy.sparse.linalg import lsqr
BASE = Affine(json.load(open(os.path.join(ROOT, 'tmp/b1863/roads/tf_bm1.json')))['M'])
def observations(drop_gcp=(), drop_read=()):
    obs = []   # (kind, px_base_x, px_base_y, a, b, value, weight): constraint a*dx + b*dy = value (kinds: gcp-x, gcp-y, road)
    for x in tps.load_gcps():
        if not x['src'].startswith('b-maps') or x['id'] in drop_gcp: continue
        p = BASE.M @ np.array([x['en'][0], x['en'][1], 1.0])
        obs.append(('g', p[0], p[1], 1, 0, x['px'][0] - p[0], 1 / 8.0, x['id'])); obs.append(('g', p[0], p[1], 0, 1, x['px'][1] - p[1], 1 / 8.0, x['id']))
    d = json.load(open(os.path.join(OUT, 'roadreads_a.json')))
    for r in d['reads']:
        if r['id'] in drop_read: continue
        p = BASE.M @ np.array([r['E'], r['N'], 1.0]); tp_ = BASE.M[:, :2] @ np.array([r['tx'], r['ty']]); tp_ /= np.linalg.norm(tp_); nrm = np.array([-tp_[1], tp_[0]])
        # a road point's offset along the normal is known; along the tangent it is free
        obs.append(('r', p[0], p[1], nrm[0], nrm[1], r['s_px'], 1 / 6.0, r['id']))
    return obs
def solve(obs, lam=25.0):
    F = Field(BASE); N = F.nx * F.ny
    A = lil_matrix((len(obs), 2 * N)); b = np.zeros(len(obs)); w = np.zeros(len(obs))
    for r, (k, px, py, a, bb, v, wt, _) in enumerate(obs):
        for kk, ww in hat_weights(px, py, F.nx, F.ny, F.x0, F.y0):
            A[r, kk] = ww * a * wt; A[r, N + kk] = ww * bb * wt
        b[r] = v * wt
    R = lil_matrix((4 * N, 2 * N)); rr = 0
    for j in range(F.ny):
        for i in range(F.nx):
            kk = j * F.nx + i
            for (di, dj) in ((1, 0), (0, 1)):
                i0, j0, i2, j2 = i - di, j - dj, i + di, j + dj
                if 0 <= i0 and i2 < F.nx and 0 <= j0 and j2 < F.ny:
                    for off in (0, N):
                        R[rr, off + kk] = -2 * lam * 0.05; R[rr, off + j0 * F.nx + i0] = lam * 0.05; R[rr, off + j2 * F.nx + i2] = lam * 0.05; rr += 1
    R = R[:rr]; Z = lil_matrix((2 * N, 2 * N)); Z.setdiag(0.02)
    sol = lsqr(vstack([csr_matrix(A), csr_matrix(R), csr_matrix(Z)]), np.concatenate([b, np.zeros(rr), np.zeros(2 * N)]), atol=1e-9, btol=1e-9, iter_lim=20000)[0]
    F.dx, F.dy = sol[:N], sol[N:]
    return F
def resid(F, obs):
    out = []
    for (k, px, py, a, bb, v, wt, i) in obs:
        dx, dy = F.disp(px, py); out.append((k, i, (a * dx + bb * dy - v) * 2.0))   # metres (2 m/px)
    return out
if __name__ == '__main__':
    obs = observations(); F = solve(obs)
    r = resid(F, obs); g = [abs(x[2]) for x in r if x[0] == 'g']; rd = [abs(x[2]) for x in r if x[0] == 'r']
    print('n GCP obs', len(g), 'rms', round(float(np.sqrt(np.mean(np.square(g)))), 1), '| road obs', len(rd), 'rms', round(float(np.sqrt(np.mean(np.square(rd)))), 1))
    # LOO on GCPs and road reads
    loo_g = []; loo_r = []
    ids_g = sorted({o[7] for o in obs if o[0] == 'g'}); ids_r = sorted({o[7] for o in obs if o[0] == 'r'})
    for i in ids_g:
        o2 = observations(drop_gcp=(i,)); F2 = solve(o2)
        full = [o for o in observations() if o[7] == i]; res = resid(F2, full)
        loo_g.append(float(np.hypot(res[0][2], res[1][2])))
    for i in ids_r:
        o2 = observations(drop_read=(i,)); F2 = solve(o2)
        full = [o for o in observations() if o[7] == i]; loo_r.append(abs(resid(F2, full)[0][2]))
    print('LOO GCP m: rms', round(float(np.sqrt(np.mean(np.square(loo_g)))), 1), 'median', round(float(np.median(loo_g)), 1), 'max', round(max(loo_g), 1))
    print('LOO road m: rms', round(float(np.sqrt(np.mean(np.square(loo_r)))), 1), 'median', round(float(np.median(loo_r)), 1), 'max', round(max(loo_r), 1))
    print('max displacement px', np.hypot(F.dx, F.dy).max())
    np.savez(os.path.join(ROOT, 'tmp/b1863/roads/field_bm1.npz'), dx=F.dx, dy=F.dy, nx=F.nx, ny=F.ny, x0=F.x0, y0=F.y0)
