"""Stage 8: the elevation error model (PDF B.9.2 step 3) from the contour residuals against the modern DEM.

Sample sets
  S0  fragments that carry a PRINTED label directly (hop 0).               level = label value.
  S2  fragments within <= 2 adjacency hops of an accepted anchor.          level = robust LS solve (orientation from regional DEM, see stage 6);
                                                                          hold-out error vs printed labels in cv_label_holdout.json.
  H   labelled hilltop rings (interior labels): DEM summit inside the ring versus the label.
  L   LEVEL-FREE: along-contour deviation of the modern DEM from its own contour mean, every extracted fragment.  Needs no label.
Datum: Warren's datum is 500 ft below 'the cemetery' (legend).  The absolute 1868 elevation of that reference is not recorded, so one scalar
K (metres) converts Warren feet to NAVD88 metres: z_m = K + 0.3048 * z_ft.  K is the MEDIAN over MARGIN-label anchors of
(mean DEM along the labelled contour - 0.3048*label); the hilltop labels are then tested independently of K.
Frame: FFD (chosen in elev1863_frame_choice.py); the affine frame is run as a sensitivity case.
Writes error_model.json, points_resid.npz (tmp), trusted_fragments.json, figures.
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s8_error_model.py
"""
import os
import sys
import json
import pickle
import collections
import numpy as np
from matplotlib.path import Path
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import elev1863_s5_levels as S5
import elev1863_s6_solve as S6
import elev1863_levels as LV
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

FRAME = 'ffd'
CLASSES = ['flat', 'slope', 'valley_floor', 'stream', 'hilltop']
FT = 0.3048


def rms(v):
    return float(np.sqrt(np.mean(np.square(v)))) if len(v) else None


def stats(r):
    r = r[np.isfinite(r)]
    if len(r) == 0:
        return {'n': 0}
    return {'n_points': int(len(r)), 'mean_m': float(np.mean(r)), 'median_m': float(np.median(r)), 'rms_m': rms(r), 'std_m': float(np.std(r)),
            'p95_abs_m': float(np.percentile(np.abs(r), 95)), 'p05_m': float(np.percentile(r, 5)), 'p95_m': float(np.percentile(r, 95))}


def main():
    frags, edges_all, D, assoc_all = S6.prepare()
    n = len(frags)
    acc = LV.accept_anchors(frags, assoc_all)
    edges = LV.reliable_edges(edges_all)
    print('anchors accepted', len(acc), 'of', len(assoc_all), '| reliable edges', len(edges), 'of', len(edges_all))
    z, hop, nvotes, spread = LV.levels(n, edges, D, acc)
    cv_rows = LV.loo_cv(frags, edges, D, acc)
    drop = []
    P = np.load(os.path.join(C.CACHE, 'points.npz'))
    frag = P['frag']
    cnt = np.bincount(frag, minlength=n)
    out = {'frame': FRAME, 'anchors_accepted': len(acc), 'anchors_dropped_misfit': drop,
           'anchors': [{'id': a['id'], 'kind': a['kind'], 'label_ft': a['level_ft'], 'frag': int(a['frag']), 'accepted_by': a['accepted_by']} for a in acc]}
    results = {}
    for frame in (FRAME, 'affine'):
        dem = P['dem_' + frame]
        clsv = P['cls_' + frame]
        sums = np.bincount(frag, dem, minlength=n)
        mean_dem = sums / np.maximum(cnt, 1)
        marg = [a for a in acc if a['kind'] == 'margin']
        Km = np.array([mean_dem[a['frag']] - FT * a['level_ft'] for a in marg])
        Ki = np.array([mean_dem[a['frag']] - FT * a['level_ft'] for a in acc if a['kind'] != 'margin'])
        Kall = np.array([mean_dem[a['frag']] - FT * a['level_ft'] for a in acc])
        K = float(np.median(Km))
        rng = np.random.RandomState(3)
        boots = [np.median(rng.choice(Km, len(Km))) for _ in range(500)]
        res = {'K_margin_median_m': K, 'K_margin_n': int(len(Km)), 'K_margin_std_m': float(Km.std()), 'K_margin_bootstrap_95ci_m': [float(np.percentile(boots, 2.5)), float(np.percentile(boots, 97.5))],
               'K_interior_median_m': float(np.median(Ki)) if len(Ki) else None, 'K_interior_n': int(len(Ki)), 'K_interior_std_m': float(Ki.std()) if len(Ki) else None,
               'K_all_median_m': float(np.median(Kall))}
        zm = K + FT * z                    # metres, per fragment (nan where unassigned)
        r = zm[frag] - dem                 # Warren minus modern, per point (nan where unassigned)
        # sets
        sets = {'S0_hop0': hop[frag] == 0, 'S1_hop1-3': (hop[frag] >= 1) & (hop[frag] <= 3), 'S2_hop4-6': (hop[frag] >= 4) & (hop[frag] <= 6)}
        res['sets'] = {}
        for sn, m in sets.items():
            ent = {'n_fragments': int(len(np.unique(frag[m]))), 'all_classes': stats(r[m]), 'by_class': {}}
            for ci, cn in enumerate(CLASSES):
                mm = m & (clsv == ci)
                ent['by_class'][cn] = dict(stats(r[mm]), n_fragments=int(len(np.unique(frag[mm]))))
            res['sets'][sn] = ent
        # level-free: along-contour deviation of DEM about each fragment's own mean, per class (every fragment >= 15 samples)
        dev = dem - mean_dem[frag]
        mL = cnt[frag] >= 15
        ent = {'n_fragments': int((cnt >= 15).sum()), 'all_classes': stats(dev[mL]), 'by_class': {}}
        for ci, cn in enumerate(CLASSES):
            mm = mL & (clsv == ci)
            ent['by_class'][cn] = dict(stats(dev[mm]), n_fragments=int(len(np.unique(frag[mm]))))
        res['L_level_free_along_contour_deviation'] = ent
        results[frame] = res
        if frame == FRAME:
            np.savez_compressed(os.path.join(C.CACHE, 'points_resid.npz'), frag=frag, r=r.astype(np.float32), dev=dev.astype(np.float32), cls=clsv, hop=hop[frag],
                                px=P['px'], py=P['py'], E=P['E_' + frame], N=P['N_' + frame], dem=dem, zm=zm[frag].astype(np.float32))
    out['by_frame'] = results
    # hilltop rings (interior labels): independent of K (K from margins)
    import rasterio
    demr = rasterio.open(C.DEM).read(1)
    hill = []
    for a in acc:
        if a['kind'] != 'interior':
            continue
        p = frags[a['frag']]['pts']
        E, N = C.load_frame(FRAME)[0](p[:, 0], p[:, 1])
        path = Path(np.stack([E, N], 1))
        e0, e1, n0, n1 = E.min(), E.max(), N.min(), N.max()
        c0, c1 = int(e0 - C.DEM_X0) - 12, int(e1 - C.DEM_X0) + 12
        r0, r1 = int(C.DEM_Y0 - n1) - 12, int(C.DEM_Y0 - n0) + 12
        sub = demr[max(0, r0):r1, max(0, c0):c1]
        ys, xs = np.mgrid[max(0, r0):max(0, r0) + sub.shape[0], max(0, c0):max(0, c0) + sub.shape[1]]
        Ep = xs + C.DEM_X0 + 0.5
        Np = C.DEM_Y0 - ys - 0.5
        inside = path.contains_points(np.stack([Ep.ravel(), Np.ravel()], 1)).reshape(sub.shape) if len(p) > 20 else np.zeros(sub.shape, bool)
        if inside.sum() < 20:
            continue
        top = float(np.max(sub[inside]))
        ring_m = results[FRAME]['K_margin_median_m'] + FT * a['level_ft']
        hill.append({'id': a['id'], 'label_ft': a['label_ft'] if 'label_ft' in a else a['level_ft'], 'ring_level_ft': a['level_ft'], 'ring_m_(K_from_margins)': ring_m, 'dem_summit_in_ring_m': top,
                     'dem_summit_minus_ring_m': top - ring_m, 'ring_area_m2': float(inside.sum()), 'ring_closed_gap_px': float(np.hypot(*(p[0] - p[-1])))})
    d = np.array([h['dem_summit_minus_ring_m'] for h in hill])
    out['hilltop_rings'] = {'n': len(hill), 'note': ('DEM summit inside the labelled ring minus the ring level (Warren says the summit is above the ring by 0 to 4 ft = 0 to 1.2 m, '
                                                      'so an unbiased agreement has a mean near +0.6 m)'),
                            'mean_m': float(d.mean()) if len(d) else None, 'median_m': float(np.median(d)) if len(d) else None, 'std_m': float(d.std()) if len(d) else None,
                            'rms_about_0.6m_m': rms(d - 0.6) if len(d) else None, 'p95_abs_about_0.6m_m': float(np.percentile(np.abs(d - 0.6), 95)) if len(d) else None, 'rings': hill}
    json.dump(out, open(os.path.join(C.OUT, 'error_model.json'), 'w'), indent=1)
    pickle.dump({'z': z, 'hop': hop, 'nvotes': nvotes, 'spread': spread, 'acc': acc, 'K': results[FRAME]['K_margin_median_m'], 'edges_reliable': edges}, open(os.path.join(C.CACHE, 'final_levels.pkl'), 'wb'))
    ok = [r for r in cv_rows if r.get('pred_ft') is not None]
    ee = np.array([r['err_ft'] for r in ok])
    hh = np.array([r['hop'] for r in ok])
    cvs = {}
    for lo, hi in [(0, 2), (3, 4), (5, 6)]:
        m = (hh >= lo) & (hh <= hi)
        if m.sum():
            cvs['%d-%d' % (lo, hi)] = {'n': int(m.sum()), 'median_abs_err_ft': float(np.median(np.abs(ee[m]))), 'within_4ft': float((np.abs(ee[m]) <= 4).mean()), 'within_8ft': float((np.abs(ee[m]) <= 8).mean())}
    json.dump({'method': 'leave-one-anchor-out on the printed labels (Warren-only truth); prediction by signed graph walk from the other anchors; hops = graph distance to the nearest remaining anchor', 'anchors': len(acc), 'predictable': len(ok), 'by_hops': cvs, 'within_4ft_all': float((np.abs(ee) <= 4).mean()), 'within_8ft_all': float((np.abs(ee) <= 8).mean()), 'rows': cv_rows}, open(os.path.join(C.OUT, 'cv_label_holdout.json'), 'w'), indent=1)
    # summary print
    for fr in (FRAME, 'affine'):
        r = results[fr]
        print(fr, 'K margin', round(r['K_margin_median_m'], 2), 'n', r['K_margin_n'], 'std', round(r['K_margin_std_m'], 2), 'CI', [round(x, 2) for x in r['K_margin_bootstrap_95ci_m']], 'K interior', r['K_interior_median_m'])
        for sn in ('S0_hop0', 'S1_hop1-3', 'S2_hop4-6'):
            e = r['sets'][sn]
            print('  ', sn, 'frags', e['n_fragments'], 'rms', e['all_classes'].get('rms_m'), 'mean', e['all_classes'].get('mean_m'))
            for cn in CLASSES:
                b = e['by_class'][cn]
                if b.get('n_points'):
                    print('      ', cn, b['n_points'], b['n_fragments'], 'mean %.2f rms %.2f p95 %.2f' % (b['mean_m'], b['rms_m'], b['p95_abs_m']))
        e = r['L_level_free_along_contour_deviation']
        print('   L', e['n_fragments'], 'rms', e['all_classes']['rms_m'])
        for cn in CLASSES:
            b = e['by_class'][cn]
            print('      ', cn, b['n_points'], b['n_fragments'], 'rms %.2f p95 %.2f' % (b['rms_m'], b['p95_abs_m']))
    print('hilltops', {k: v for k, v in out['hilltop_rings'].items() if k != 'rings'})


if __name__ == '__main__':
    main()
