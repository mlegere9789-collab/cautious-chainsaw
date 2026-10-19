"""Smooth displacement-field registration of sheet 'a' to the ground using the major turnpikes/county roads as a 1-D constraint
(normal offset between the drawn double-line road and the modern centreline), starting from an affine fitted to the GCPs.
Model: ground->px = affine(E,N) + d(px) where d is a bilinear field on a coarse grid (spacing STEP px), regularised toward smoothness.
Outputs: tmp/b1863/roads/field_a.npz (grid, dx, dy), per-sample residual stats."""
import sys, os, json, math
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from icp2 import *
from scipy.sparse import lil_matrix, vstack, csr_matrix
from scipy.sparse.linalg import lsqr
STEP = 450
def hat_weights(x, y, nx, ny, x0, y0):
    gx = (x - x0) / STEP; gy = (y - y0) / STEP
    i = int(np.clip(math.floor(gx), 0, nx - 2)); j = int(np.clip(math.floor(gy), 0, ny - 2))
    fx = gx - i; fy = gy - j
    return [(j * nx + i, (1 - fx) * (1 - fy)), (j * nx + i + 1, fx * (1 - fy)), ((j + 1) * nx + i, (1 - fx) * fy), ((j + 1) * nx + i + 1, fx * fy)]
class Field:
    def __init__(self, base, x0=0, y0=300, W=4146, H=5078):
        self.base = base; self.x0, self.y0 = x0, y0; self.nx = int(math.ceil(W / STEP)) + 1; self.ny = int(math.ceil(H / STEP)) + 1
        self.dx = np.zeros(self.nx * self.ny); self.dy = np.zeros(self.nx * self.ny)
    def disp(self, x, y):
        hw = hat_weights(x, y, self.nx, self.ny, self.x0, self.y0)
        return sum(w * self.dx[k] for k, w in hw), sum(w * self.dy[k] for k, w in hw)
    def ll2px(self, lng, lat):
        x, y = self.base.ll2px(lng, lat); dx, dy = self.disp(x, y); return x + dx, y + dy
    def en2px(self, e, n):
        p = self.base.M @ np.array([e, n, 1.0]); dx, dy = self.disp(p[0], p[1]); return p[0] + dx, p[1] + dy
def solve(base, meas, lam=40.0, iters=6):
    F = Field(base); N = F.nx * F.ny
    for it in range(iters):
        rows = []; rhs = []; wts = []
        A = lil_matrix((len(meas), 2 * N)); b = np.zeros(len(meas))
        for r, (E, Nn, px, py, nx_, ny_, s, pr, nm) in enumerate(meas):
            # current predicted px with field; measured offset s is relative to the BASE prediction (px,py), along the normal (nx_,ny_)
            for k, w in hat_weights(px, py, F.nx, F.ny, F.x0, F.y0):
                A[r, k] = w * nx_; A[r, N + k] = w * ny_
            b[r] = s
        # smoothness: second differences
        R = lil_matrix((4 * N, 2 * N)); rr = 0
        for j in range(F.ny):
            for i in range(F.nx):
                k = j * F.nx + i
                for (di, dj) in ((1, 0), (0, 1)):
                    i0, j0, i2, j2 = i - di, j - dj, i + di, j + dj
                    if 0 <= i0 and i2 < F.nx and 0 <= j0 and j2 < F.ny:
                        for off in (0, N):
                            R[rr, off + k] = -2 * lam; R[rr, off + j0 * F.nx + i0] = lam; R[rr, off + j2 * F.nx + i2] = lam; rr += 1
        R = R[:rr]
        # weak ridge to zero
        Z = lil_matrix((2 * N, 2 * N)); Z.setdiag(2.0)
        Afull = vstack([csr_matrix(A), csr_matrix(R), csr_matrix(Z)]); bfull = np.concatenate([b, np.zeros(rr), np.zeros(2 * N)])
        sol = lsqr(Afull, bfull, atol=1e-8, btol=1e-8, iter_lim=5000)[0]
        F.dx, F.dy = sol[:N], sol[N:]
        break
    return F
if __name__ == '__main__':
    s = 'a'
    base = Affine(json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', sys.argv[1])))['M'])
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    samples = line_samples(t, lambda p: (p['name'] or '') in MAJOR, step_m=20.0)
    ink = ink_map(s); inkb = cv2.GaussianBlur(ink, (0, 0), 1.2)
    meas = measure2(base, samples, inkb, half=36)
    # keep only measurements with plausible offsets
    meas = [m for m in meas if abs(m[6]) < 34]
    print(len(meas), 'measurements')
    F = solve(base, meas)
    # evaluate: residual after field
    res = []
    for (E, Nn, px, py, nx_, ny_, sx, pr, nm) in meas:
        dx, dy = F.disp(px, py); res.append(sx - (dx * nx_ + dy * ny_))
    res = np.array(res); print('before: median |s|', np.median(np.abs([m[6] for m in meas])), 'after: median |res|', np.median(np.abs(res)), 'p90', np.percentile(np.abs(res), 90))
    np.savez(os.path.join(ROOT, 'tmp/b1863/roads/field_a.npz'), dx=F.dx, dy=F.dy, nx=F.nx, ny=F.ny, x0=F.x0, y0=F.y0, step=STEP, M=base.M)
    print('max displacement px', np.hypot(F.dx, F.dy).max())
