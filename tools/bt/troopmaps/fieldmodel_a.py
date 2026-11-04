"""fieldmodel_a.py : the roads-task registration of Bachelder sheet 1 (docs/basemap1863/features/roads-rail-water/registration_sheet_a.json): ground EN -> 50% px = base affine + bilinear displacement field d(px);
scan (full-res) px = 2 x px50.  Inverse (scan px -> EN) by Newton iteration."""
import json, math, os, numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
R = json.load(open(os.path.join(ROOT, 'docs/basemap1863/features/roads-rail-water/registration_sheet_a.json')))
M = np.array(R['base_M']); F = R['field']; STEP = F['grid_step_px']; nx, ny, x0, y0 = F['nx'], F['ny'], F['x0'], F['y0']
DX = np.array(F['dx_px']); DY = np.array(F['dy_px'])
def disp(x, y):
    gx = (x - x0) / STEP; gy = (y - y0) / STEP
    i = int(np.clip(math.floor(gx), 0, nx - 2)); j = int(np.clip(math.floor(gy), 0, ny - 2)); fx = gx - i; fy = gy - j
    w = [(j * nx + i, (1 - fx) * (1 - fy)), (j * nx + i + 1, fx * (1 - fy)), ((j + 1) * nx + i, (1 - fx) * fy), ((j + 1) * nx + i + 1, fx * fy)]
    return sum(a * DX[k] for k, a in w), sum(a * DY[k] for k, a in w)
def en_to_scan(E, N):
    p = M @ np.array([E, N, 1.0]); dx, dy = disp(p[0], p[1]); return 2 * np.array([p[0] + dx, p[1] + dy])
def scan_to_en(x, y):
    t = np.array([x, y], float) / 2; A = M[:, :2]; en = np.linalg.solve(A, t - M[:, 2])
    for _ in range(30):
        q = en_to_scan(*en) / 2; err = t - q
        if np.hypot(*err) < 1e-4: break
        en = en + np.linalg.solve(A, err)
    return en
if __name__ == '__main__':
    import sys
    G = {g['id']: g for g in json.load(open(os.path.join(os.path.dirname(__file__), 'gt_j1.json')))}
    H = json.load(open(os.path.join(os.path.dirname(__file__), 'hand_gt_a.json')))
    for p in H['points']:
        g = G[p['gt']]; pr = en_to_scan(g['E'], g['N']); print(p['gt'], 'read', p['scan_px'], 'field model predicts', pr.round(0), 'diff px', (pr - p['scan_px']).round(0), 'm', round(float(np.hypot(*(scan_to_en(*p['scan_px']) - [g['E'], g['N']]))), 1))
