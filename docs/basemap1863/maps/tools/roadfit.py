"""Mixed constraint fit: 2-D point GCPs + 1-D road-line constraints (a scan point known to lie ON the centreline of a named modern road;
only its distance normal to that road is used, because the position along the road is not known).

   from roadfit import *;  fit = RoadFit('gcps/warren.json', degree=1); fit.solve(); fit.report()
Iterates: foot point on the named polyline nearest to the current prediction; solves the linear least squares for the polynomial
coefficients (px -> EN); repeats.  Line constraints are down-weighted by `wl` (default 0.7) because TIGER centrelines are not
the 1863 centrelines (typical difference 5-15 m: re-grading, widening, dualling)."""
import json, os, numpy as np
from shapely.geometry import shape, Point, LineString
from shapely.ops import nearest_points
from common import *
from georef import _terms

ALIAS = {'Fairfield Rd': ['Fairfield Rd', 'State Rte 116'], 'Hagerstown Rd': ['State Rte 116'], 'Baltimore Pike': ['Baltimore Pike', 'State Rte 97'], 'Chambersburg Pike': ['Chambersburg Rd', 'US Hwy 30'],
         'Carlisle Rd': ['Carlisle St', 'State Rte 34', 'US Hwy 15 Bus'], 'York Pike': ['York Rd', 'York St', 'US Hwy 30'], 'Harrisburg Rd': ['Old Harrisburg Rd', 'Harrisburg St'], 'Hanover Rd': ['Hanover Rd', 'State Rte 116', 'Hanover St'],
         'Taneytown Rd': ['Taneytown Rd', 'State Rte 134'], 'Emmitsburg Rd': ['Emmitsburg Rd', 'US Hwy 15 Bus']}
_ROADS = None
def roads():
    global _ROADS
    if _ROADS is None:
        _ROADS = {}
        for n in ['tiger_primary', 'tiger_secondary', 'tiger_local']:
            for f in json.load(open(os.path.join(TMP, 'ref', n + '.geojson')))['features']:
                g = shape(f['geometry']); gs = list(g.geoms) if g.geom_type == 'MultiLineString' else [g]
                _ROADS.setdefault(f['properties'].get('NAME'), []).extend(gs)
    return _ROADS
def lines_for(name):
    r = roads(); names = ALIAS.get(name, [name]); out = []
    for nm in names: out += r.get(nm, [])
    return out
def foot(name, e, n):
    p = Point(e, n); best = None
    for ln in lines_for(name):
        d = ln.distance(p)
        if best is None or d < best[0]: best = (d, ln)
    ln = best[1]; s = ln.project(p); f = ln.interpolate(s)
    a = ln.interpolate(max(0, s - 2)); b = ln.interpolate(min(ln.length, s + 2)); t = np.array([b.x - a.x, b.y - a.y]); t /= (np.linalg.norm(t) or 1)
    return np.array([f.x, f.y]), np.array([-t[1], t[0]])

class RoadFit:
    def __init__(self, path, degree=1, wl=0.7, smooth=0.0):
        self.path = path; self.d = json.load(open(path)); self.deg = degree; self.wl = wl
        self.pts = [g for g in self.d['gcps'] if g.get('use', True)]; self.lines = [l for l in self.d.get('lines', []) if l.get('use', True)]
    def _fit_core(self, pts, lines, iters=12):
        P = np.array([g['px'] for g in pts], float) if pts else np.zeros((0, 2)); E = np.array([g['en'] for g in pts], float) if pts else np.zeros((0, 2))
        L = np.array([l['px'] for l in lines], float) if lines else np.zeros((0, 2))
        allp = np.vstack([P, L]) if len(L) else P
        c = allp.mean(0); s = allp.std(0).mean(); dc = E.mean(0) if len(E) else np.array([309000., 4410000.]); ds = 1000.0
        Z = lambda q: (np.asarray(q, float) - c) / s
        A_pt = _terms(self.deg, *Z(P).T) if len(P) else np.zeros((0, 1)); A_ln = _terms(self.deg, *Z(L).T) if len(L) else np.zeros((0, 1))
        # initial: affine from points if possible else from first guess
        if len(P) >= 3: C = np.linalg.lstsq(A_pt, (E - dc) / ds, rcond=None)[0]
        else: raise ValueError('need >=3 point GCPs to start')
        for it in range(iters):
            rows = [A_pt]; rhs = [(E - dc) / ds]
            if len(L):
                pred = (A_ln @ C) * ds + dc
                feet = []; nors = []
                for l, pr in zip(lines, pred):
                    f, nn = foot(l['road'], pr[0], pr[1]); feet.append(f); nors.append(nn)
                feet = np.array(feet); nors = np.array(nors)
                # constraint: n . (A C ds + dc - f) = 0  ->  (n_x A, n_y A) . vec(C) ; build per-row in unknown vec [Cx(all terms); Cy(all terms)]
            nt = A_pt.shape[1]
            M = []; b = []
            for a, e in zip(A_pt, (E - dc) / ds):
                M.append(np.concatenate([a, np.zeros(nt)])); b.append(e[0]); M.append(np.concatenate([np.zeros(nt), a])); b.append(e[1])
            if len(L):
                for a, nn, f in zip(A_ln, nors, feet):
                    w = self.wl
                    M.append(w * np.concatenate([nn[0] * a, nn[1] * a])); b.append(w * (nn @ (f - dc)) / ds)
            sol = np.linalg.lstsq(np.array(M), np.array(b), rcond=None)[0]
            C = np.stack([sol[:nt], sol[nt:]], 1)
        self.c, self.s, self.dc, self.ds = c, s, dc, ds
        return C
    def model(self, C, c, s, dc, ds):
        return lambda q: (_terms(self.deg, *((np.atleast_2d(np.asarray(q, float)) - c) / s).T) @ C) * ds + dc
    def solve(self):
        C = self._fit_core(self.pts, self.lines); self.C = C
        self.f = self.model(C, self.c, self.s, self.dc, self.ds); return self
    def residuals(self, f=None, pts=None, lines=None):
        f = f or self.f; pts = self.pts if pts is None else pts; lines = self.lines if lines is None else lines
        rp = [np.linalg.norm(f([g['px']])[0] - np.array(g['en'])) for g in pts]
        rl = []
        for l in lines:
            pr = f([l['px']])[0]; ft, nn = foot(l['road'], pr[0], pr[1]); rl.append(float(abs(nn @ (pr - ft))))
        return np.array(rp), np.array(rl)
    def loo(self):
        rp = []; rl = []
        for i, g in enumerate(self.pts):
            p2 = [x for j, x in enumerate(self.pts) if j != i]
            C = self._fit_core(p2, self.lines); f = self.model(C, self.c, self.s, self.dc, self.ds)
            rp.append(float(np.linalg.norm(f([g['px']])[0] - np.array(g['en']))))
        for i, l in enumerate(self.lines):
            l2 = [x for j, x in enumerate(self.lines) if j != i]
            C = self._fit_core(self.pts, l2); f = self.model(C, self.c, self.s, self.dc, self.ds)
            pr = f([l['px']])[0]; ft, nn = foot(l['road'], pr[0], pr[1]); rl.append(float(abs(nn @ (pr - ft))))
        return np.array(rp), np.array(rl)
    def report(self, do_loo=True):
        rp, rl = self.residuals(); out = dict(degree=self.deg, n_points=len(self.pts), n_lines=len(self.lines), fit_point_rmse=float(np.sqrt(np.mean(rp**2))) if len(rp) else None, fit_line_rmse=float(np.sqrt(np.mean(rl**2))) if len(rl) else None)
        if do_loo:
            lp, ll = self.loo(); out.update(loo_point_rmse=float(np.sqrt(np.mean(lp**2))) if len(lp) else None, loo_line_rmse=float(np.sqrt(np.mean(ll**2))) if len(ll) else None, loo_point_max=float(lp.max()) if len(lp) else None, loo_line_max=float(ll.max()) if len(ll) else None)
            out['_loo_points'] = lp.tolist(); out['_loo_lines'] = ll.tolist()
        return out
