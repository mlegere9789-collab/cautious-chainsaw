"""Affine registration of sheet 'a' from (i) the b-maps agent's Warren GCPs mapped into sheet 'a' (tps.load_gcps minus own picks) and (ii) hand-read road-line constraints:
at a station on a named modern road, the drawn road centre was read on a panel with a pixel ruler (stations.py); constraint = drawn road line passes through that point (normal component only).
Station readings are in roadreads_a.json (offsets s in px along +nrm relative to the base transform tf_bm1)."""
import sys, os, json, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from georef import *
import tps
BASE = os.path.join(ROOT, 'tmp/b1863/roads/tf_bm1.json')
def stations():
    d = json.load(open(os.path.join(OUT, 'roadreads_a.json')))
    return d
def fit(wg=1 / 8.0, wr=1 / 6.0, use_roads=True, drop_gcps=(), drop_reads=()):
    base = Affine(json.load(open(BASE))['M'])
    g = [x for x in tps.load_gcps() if x['src'].startswith('b-maps') and x['id'] not in drop_gcps]
    A = []; b = []; W = []
    for x in g:   # M @ [E,N,1] = px  (2 equations)
        E, N = x['en']; A.append([E, N, 1, 0, 0, 0]); b.append(x['px'][0]); W.append(wg)
        A.append([0, 0, 0, E, N, 1]); b.append(x['px'][1]); W.append(wg)
    reads = []
    if use_roads:
        for r in stations()['reads']:
            if r['id'] in drop_reads: continue
            E, N, tx, ty, s = r['E'], r['N'], r['tx'], r['ty'], r['s_px']
            p = base.M @ np.array([E, N, 1.0]); tp_ = base.M[:, :2] @ np.array([tx, ty]); tp_ /= np.linalg.norm(tp_); nrm = np.array([-tp_[1], tp_[0]])
            q = p + s * nrm                         # drawn road point (px)
            # constraint: nrm . (M[E,N,1] - q) = 0
            A.append([nrm[0] * E, nrm[0] * N, nrm[0], nrm[1] * E, nrm[1] * N, nrm[1]]); b.append(float(nrm @ q)); W.append(wr)
            reads.append((r['id'], nrm, q, E, N))
    A = np.array(A); b = np.array(b); W = np.array(W)
    sol = np.linalg.lstsq(A * W[:, None], b * W, rcond=None)[0]
    M = np.array([[sol[0], sol[1], sol[2]], [sol[3], sol[4], sol[5]]])
    return Affine(M), g, reads
def residuals(af, g, reads):
    gr = []
    for x in g:
        p = af.M @ np.array([x['en'][0], x['en'][1], 1.0]); gr.append(float(np.linalg.norm(p - np.array(x['px']))) * 2.0)
    rr = []
    for rid, nrm, q, E, N in reads:
        p = af.M @ np.array([E, N, 1.0]); rr.append(float(abs(nrm @ (p - q))) * 2.0)
    return gr, rr
if __name__ == '__main__':
    af, g, reads = fit()
    gr, rr = residuals(af, g, reads)
    M = af.M
    print('scale m/px', 1 / math.hypot(M[0, 0], M[1, 0]), 1 / math.hypot(M[0, 1], M[1, 1]), 'rot', math.degrees(math.atan2(M[1, 0], M[0, 0])))
    print('GCP resid m: rms', round(float(np.sqrt(np.mean(np.square(gr)))), 1), 'max', round(max(gr), 1), '| road resid m: rms', round(float(np.sqrt(np.mean(np.square(rr)))), 1) if rr else None, 'max', round(max(rr), 1) if rr else None)
    # leave-one-out on road reads
    loo = []
    for r in stations()['reads']:
        a2, g2, rd2 = fit(drop_reads=(r['id'],))
        E, N = r['E'], r['N']; base = Affine(json.load(open(BASE))['M'])
        p = base.M @ np.array([E, N, 1.0]); tp_ = base.M[:, :2] @ np.array([r['tx'], r['ty']]); tp_ /= np.linalg.norm(tp_); nrm = np.array([-tp_[1], tp_[0]])
        q = p + r['s_px'] * nrm; pp = a2.M @ np.array([E, N, 1.0]); loo.append(float(abs(nrm @ (pp - q))) * 2.0)
    print('LOO road resid m: rms', round(float(np.sqrt(np.mean(np.square(loo)))), 1), 'median', round(float(np.median(loo)), 1), 'max', round(max(loo), 1))
    json.dump({'M': af.M.tolist(), 'method': 'affine from b-maps Warren GCPs plus hand-read road constraints'}, open(os.path.join(ROOT, 'tmp/b1863/roads/tf_rg.json'), 'w'))
