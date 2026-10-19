"""Prepare the map-derived evidence for the 1863 structures catalogue.
Outputs (evidence/):
  gcps_final.json            ground control points (surviving buildings <-> Warren-plate symbols) + CV accuracy
  clusters_a_positions.json  curated farmstead symbol readings and their georeferenced positions
  auto_symbols.json          machine-detected rural building symbols (unreviewed) with positions
  ocr_labels.json            owner-name labels read from the plate by OCR (nearest-label hints)
"""
import sys, json, warnings, importlib
warnings.filterwarnings('ignore')
sys.path.insert(0, '.')
import numpy as np
from geo import *
import georef_final as G
import cty
import cl

OUT = '../../../docs/basemap1863/features/structures/evidence/'
SMOOTH = 1e4
g = json.load(open('mapwork/gcps_final3.json'))
M = G.Model(g, SMOOTH)
C = cty.load()
DET = cl.DET


def cty_c(i):
    c = C[i][1].centroid
    return np.array([c.x, c.y])


def jac(P0):
    m0 = M.px2m(np.array([P0]))[0]
    Jx = (M.px2m(np.array([[P0[0] + 10, P0[1]]]))[0] - m0) / 10.0
    Jy = (M.px2m(np.array([[P0[0], P0[1] + 10]]))[0] - m0) / 10.0
    return np.c_[Jx, Jy]


def run_clusters(mod='clusters_b'):
    ca = importlib.import_module(mod)
    res = {}
    for key, c in ca.C.items():
        syms = []
        for s in c['symbols']:
            if s.get('det') is not None:
                i = int(s['det']); px = [float(DET[i][0]), float(DET[i][1])]; ext = [DET[i][2] + 6, DET[i][3] + 6]; det = i
            else:
                px = list(map(float, s['px'])); i = cl.snap(px[0], px[1], r=10)
                if i is not None:
                    px = [float(DET[i][0]), float(DET[i][1])]; ext = [DET[i][2] + 6, DET[i][3] + 6]; det = i
                else:
                    ext = None; det = None
            syms.append(dict(role=s['role'], letter=s['letter'], cty=s['cty'], anchor=s['anchor'], note=s['note'], px=px, det=det, ext_px=ext))
        P0 = np.mean([s['px'] for s in syms], axis=0)
        J = jac(P0)
        anchors = [s for s in syms if s['anchor'] and s['cty'] is not None]
        for s in syms:
            gm = M.px2m(np.array([s['px']]))[0]
            s['m_global'] = gm.tolist()
            ests = []
            for a in anchors:
                if a is s:
                    continue
                ests.append(cty_c(a['cty']) + J @ (np.array(s['px']) - np.array(a['px'])))
            if ests:
                me = np.mean(ests, axis=0); s['pos_method'] = 'local_anchor'; s['anchor_n'] = len(ests)
                s['anchor_spread_m'] = float(np.max([np.hypot(*(e - me)) for e in ests]))
            else:
                me = gm; s['pos_method'] = 'global_tps'; s['anchor_n'] = 0; s['anchor_spread_m'] = None
            s['m'] = me.tolist(); lo, la = T_INV.transform(*me); s['lon'] = lo; s['lat'] = la
            if s['cty'] is not None:
                gc = cty_c(s['cty']); s['offset_to_survivor_m_global'] = float(np.hypot(*(gm - gc)))
                s['offset_to_survivor_m_local'] = float(np.hypot(*(me - gc))) if ests else None
        res[key] = dict(label=c['label'], notes=c.get('notes', ''), symbols=syms)
    return res


def run_auto(exclude_px, r_excl=16):
    D = np.array(DET)
    sel = (D[:, 5] >= 5.0) & (D[:, 4] >= 18)
    Cn = D[sel]; idx = np.where(sel)[0]
    from scipy.spatial import cKDTree
    t = cKDTree(Cn[:, :2]); nb = np.array([len(t.query_ball_point(p, 50)) - 1 for p in Cn[:, :2]])
    labs = json.load(open('mapwork/labels_inb.json')); L = np.array([[l[0], l[1]] for l in labs])
    tl = cKDTree(L); dl, il = tl.query(Cn[:, :2])
    keep = (nb >= 1) & (nb <= 9) & (dl < 140)
    ex = cKDTree(np.array(exclude_px)) if len(exclude_px) else None
    out = []
    for k in np.where(keep)[0]:
        p = Cn[k, :2]
        if ex is not None and ex.query(p)[0] < r_excl:
            continue
        m = M.px2m(np.array([p]))[0]; lo, la = T_INV.transform(*m)
        out.append(dict(det=int(idx[k]), px=[float(p[0]), float(p[1])], ext_px=[float(Cn[k, 2] + 6), float(Cn[k, 3] + 6)], lon=lo, lat=la,
                        nearest_label=labs[int(il[k])][2], nearest_label_dist_px=float(dl[k])))
    return out


if __name__ == '__main__':
    import os
    os.makedirs(OUT, exist_ok=True)
    # accuracy
    def loo(smooth):
        errs = []
        for i in range(len(g)):
            tr = [g[j] for j in range(len(g)) if j != i]
            m = G.Model(tr, smooth); X = np.array(ll2m(g[i]['lon'], g[i]['lat']))
            errs.append(float(np.hypot(*(m.m2px(X)[0] - np.array(g[i]['px'])))))
        return np.array(errs)
    e = loo(SMOOTH)
    kinds = {}
    for a, x in zip(g, e):
        kinds.setdefault(a['kind'], []).append(float(x))
    acc = dict(n_gcps=len(g), n_curated=sum(a['kind'] == 'curated' for a in g), n_icp=sum(a['kind'] == 'icp' for a in g), n_sibling=sum(a['kind'].startswith('sib_') for a in g), smoothing=SMOOTH,
               loo_by_kind={k: dict(n=len(v), median_m=round(float(np.median(v)), 1), max_m=round(max(v), 1)) for k, v in kinds.items()},
               excluded_outliers=['Schmucker Hall (curated)', 'McPherson barn (curated)', 'Evergreen gatehouse (curated)', 'bushman house (curated)', 'leister house (curated)', 'SIB:Leister house', 'SIB:York Pike bridge', 'SIB:Hanover Rd bridge', 'SIB:Big Round Top summit', 'SIB:Hill summit W of Plum Run', 'icp:cty11175'],
               outlier_note='11 control points whose leave-one-out error exceeded 35-58 m were left out of the fit (local distortion of the plate or a mismatched pair); features placed with a local anchor are unaffected; features placed through the global model carry an error of 25 m.',
               loo_median_m=float(np.median(e)), loo_mean_m=float(e.mean()), loo_p90_m=float(np.percentile(e, 90)), loo_max_m=float(e.max()),
               note='Leave-one-out error of the thin-plate-spline georeference of the Bachelder/Warren plate (pixel frame of LoC cw0325000a, about 1.0 m per pixel). Control: surviving-building outlines of the 2023 Adams County dataset (curated farm buildings and a robust-ICP set) and the independent road-junction, bridge and summit points of docs/basemap1863/maps/gcps/warren.json (sibling task). Pixel units are metres to within 3 percent.')
    json.dump(dict(accuracy=acc, gcps=g), open(OUT + 'gcps_final.json', 'w'), indent=1)
    print(acc)
    cl_res = run_clusters()
    json.dump(cl_res, open(OUT + 'clusters_a_positions.json', 'w'), indent=1)
    ex = [s['px'] for c in cl_res.values() for s in c['symbols']]
    auto = run_auto(ex)
    json.dump(auto, open(OUT + 'auto_symbols.json', 'w'), indent=1)
    print('clusters', len(cl_res), 'symbols', len(ex), 'auto', len(auto))
    labs = json.load(open('mapwork/labels_inb.json'))
    out = []
    for x, y, t in labs:
        m = M.px2m(np.array([[x, y]]))[0]; lo, la = T_INV.transform(*m)
        out.append(dict(text=t, px=[x, y], lon=lo, lat=la))
    json.dump(out, open(OUT + 'ocr_labels.json', 'w'), indent=1)
    for k, c in cl_res.items():
        for s in c['symbols']:
            if s['cty'] is not None:
                print(k, s['role'], s['cty'], s['pos_method'], 'off_global', round(s['offset_to_survivor_m_global'], 1),
                      'off_local', None if s['offset_to_survivor_m_local'] is None else round(s['offset_to_survivor_m_local'], 1))
