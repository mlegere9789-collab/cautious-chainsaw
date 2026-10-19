"""Fit the Warren transform from gcps/warren.json, compose the derived maps (Bachelder sheets via SIFT to Warren, others via pairs),
write docs/basemap1863/maps/transforms/*.json (committed), georeferenced rasters (tmp/b1863/maps/georef/*.tif), thumbnails (committed).
python finalize.py fit|raster|thumbs|all"""
import sys, os, json, glob, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
from common import *
import georef
OUTT = os.path.join(OUT, 'transforms'); os.makedirs(OUTT, exist_ok=True)
def affine_fit(px, en):
    A = np.c_[px, np.ones(len(px))]; sol = np.linalg.lstsq(A, en, rcond=None)[0]   # (3,2): EN = [x y 1] @ sol
    return sol
def fit_warren():
    d, px, en, g = georef.load_gcps(os.path.join(OUT, 'gcps', 'warren.json'))
    ids = [x['id'] for x in g]
    sol = affine_fit(px, en); pred = np.c_[px, np.ones(len(px))] @ sol; res = np.linalg.norm(pred - en, axis=1)
    summ = georef.summary(px, en, (('affine', 0), ('poly2', 0), ('tps', 0.5), ('tps', 2.0)))
    # robust affine: drop GCPs whose affine residual > 2x median residual iteratively once
    keep = res < max(2.0 * np.median(res), 20.0)
    sol_r = affine_fit(px[keep], en[keep]); res_r = np.linalg.norm(np.c_[px, np.ones(len(px))] @ sol_r - en, axis=1)
    loo = []
    for i in range(len(px)):
        k = np.arange(len(px)) != i; s = affine_fit(px[k], en[k]); loo.append(float(np.linalg.norm(np.r_[px[i], 1] @ s - en[i])))
    A = sol[:2].T   # EN = A @ [x,y] + t
    t = sol[2]; sx = float(np.hypot(*A[:, 0])); sy = float(np.hypot(*A[:, 1])); rot = float(np.degrees(np.arctan2(A[1, 0] * -1, A[0, 0])))
    # inverse EN -> px
    Ai = np.linalg.inv(A); ti = -Ai @ t
    lines = d.get('lines', [])
    import roadfit
    rf = roadfit.RoadFit(os.path.join(OUT, 'gcps', 'warren.json'), degree=1); rf.lines = []; rf.solve()
    _, rl = rf.residuals(lines=[l for l in lines if l.get('use', True)])
    out = dict(map_id='warren-1869', title='Map of the battle-field of Gettysburg (Warren survey 1868-69, revised 1873)', loc_item='https://www.loc.gov/item/99448794/', scan='cw0353500.jp2', crs=CRS,
               gcp_file='docs/basemap1863/maps/gcps/warren.json', n_gcps=int(len(px)), model_recommended='affine',
               px_to_en=dict(A=A.tolist(), t=t.tolist(), note='E,N = A @ [x,y] + t ; x right, y down in the 8878x9845 service JP2 of the LOC item'),
               en_to_px=dict(A=Ai.tolist(), t=ti.tolist()),
               affine_scale_m_per_px=[sx, sy], rotation_deg=rot,
               accuracy=dict(fit_rmse_m=float(np.sqrt(np.mean(res ** 2))), loo_rmse_m=float(np.sqrt(np.mean(np.square(loo)))), loo_max_m=float(max(loo)), loo_median_m=float(np.median(loo)),
                             robust_affine_n=int(keep.sum()), robust_fit_rmse_m=float(np.sqrt(np.mean(res_r[keep] ** 2))), independent_road_line_rmse_m=float(np.sqrt(np.mean(rl ** 2))), independent_road_line_resid_m=[round(float(v), 1) for v in rl], n_independent_lines=int(len(rl))),
               model_comparison=summ,
               residuals=[dict(id=i, name=x['name'], kind=x['kind'], resid_m=round(float(r), 1), loo_m=round(l, 1), dE=round(float(p[0] - e[0]), 1), dN=round(float(p[1] - e[1]), 1)) for i, x, r, l, p, e in zip(ids, g, res, loo, pred, en)])
    out['robust_px_to_en'] = dict(A=sol_r[:2].T.tolist(), t=sol_r[2].tolist())
    # leave-one-out on the robust set (each kept GCP predicted without itself; refit robustly is not repeated: same exclusion list)
    kidx = np.nonzero(keep)[0]; loo_r = []
    for i in kidx:
        k2 = [j for j in kidx if j != i]; s2 = affine_fit(px[k2], en[k2]); loo_r.append(float(np.linalg.norm(np.r_[px[i], 1] @ s2 - en[i])))
    # independent road-line check with the robust transform
    Ar = sol_r[:2].T; tr_ = sol_r[2]
    f_r = lambda q: (np.atleast_2d(np.asarray(q, float)) @ Ar.T) + tr_
    rp2, rl2 = rf.residuals(f=f_r, pts=[], lines=[l for l in lines if l.get('use', True)])
    out['excluded_from_robust'] = [i for i, kk in zip(ids, keep) if not kk]
    out['accuracy'].update(robust_loo_rmse_m=float(np.sqrt(np.mean(np.square(loo_r)))), robust_loo_max_m=float(max(loo_r)), robust_independent_road_line_rmse_m=float(np.sqrt(np.mean(rl2 ** 2))), robust_independent_road_line_resid_m=[round(float(v), 1) for v in rl2])
    out['model_recommended'] = 'affine (all GCPs)'
    out['recommendation_note'] = 'The robust affine (2 GCPs dropped) lowers the fit RMSE but raises the independent road-line RMSE (%.1f vs %.1f m), so it is not judged better; all-GCP affine is used.' % (out['accuracy']['robust_independent_road_line_rmse_m'], out['accuracy']['independent_road_line_rmse_m'])
    json.dump(out, open(os.path.join(OUTT, 'warren-1869.json'), 'w'), indent=1)
    print('warren', {k: round(v, 2) if isinstance(v, float) else v for k, v in out['accuracy'].items() if not isinstance(v, list)}, out['excluded_from_robust'], 'scale', sx, sy, 'rot', rot)
    return sol
def chain(regjson):
    r = json.load(open(regjson)); Wm = np.array(json.load(open(os.path.join(OUTT, 'warren-1869.json')))['px_to_en']['A']); Wt = np.array(json.load(open(os.path.join(OUTT, 'warren-1869.json')))['px_to_en']['t'])
    M = np.array(r['A'])      # scan px -> warren px
    A = Wm @ M[:, :2]; t = Wm @ M[:, 2] + Wt
    return r, A, t
def fit_derived():
    names = {'cw0325000a': ('bachelder-1876-sheet1', "Bachelder, Map of the battle field of Gettysburg, First day's battle (1876)", 'https://www.loc.gov/item/99447491/'),
             'cw0325000b': ('bachelder-1876-sheet2', "Bachelder, Map of the battle field of Gettysburg, Second day's battle (1876)", 'https://www.loc.gov/item/99447491/'),
             'cw0325000c': ('bachelder-1876-sheet3', "Bachelder, Map of the battle field of Gettysburg, Third day's battle (1876)", 'https://www.loc.gov/item/99447491/')}
    for k, (mid, title, url) in names.items():
        p = os.path.join(TMP, 'reg', 'bachelder_a.json' if k == 'cw0325000a' else k + '.json')
        if not os.path.exists(p): continue
        r, A, t = chain(p)
        Ai = np.linalg.inv(A); ti = -Ai @ t
        W = json.load(open(os.path.join(OUTT, 'warren-1869.json')))
        out = dict(map_id=mid, title=title, loc_item=url, scan=k + '.jp2', crs=CRS, method='SIFT feature matching to the Warren scan (same engraved topographic base), robust affine (RANSAC), composed with the Warren affine',
                   px_to_en=dict(A=A.tolist(), t=t.tolist()), en_to_px=dict(A=Ai.tolist(), t=ti.tolist()), px_to_warren_px=r['A'],
                   accuracy=dict(sift_inliers=r['n_inliers'], sift_matches=r['n_matches'], relative_to_warren_rms_m=round(r['rms_px'] * 1.0, 2), relative_to_warren_median_m=round(r['median_px'], 2),
                                 absolute_rmse_m_note='relative error adds in quadrature to the Warren absolute error (%.1f m leave-one-out RMSE)' % W['accuracy']['loo_rmse_m']))
        json.dump(out, open(os.path.join(OUTT, mid + '.json'), 'w'), indent=1); print(mid, out['accuracy']['relative_to_warren_rms_m'])
if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'fit'
    if what in ('fit', 'all'): fit_warren()
