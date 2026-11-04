"""georef_sheet.py <sheet a|b|c> : independent georeference check of a Bachelder 1876 sheet.
Inputs: hand_readings_<sheet>.json (offset in scan px of the feature as read by eye from tools/bt/troopmaps/gcp_montage.py crops, relative to the position predicted
by the committed chain from the Warren GCP). Outputs: terrain/troopmaps/transform_bachelder1876_<sheet>.json (+ accuracy report numbers).
Models: (R) chain of record (docs/basemap1863: TPS scan->Warren px, Warren affine); (D) direct affine scan px -> ground from the hand-read points only.
"""
import sys, json, numpy as np
from common_tm import *
sheet = sys.argv[1]
H = json.load(open(os.path.join(os.path.dirname(__file__), f'hand_readings_{sheet}.json')))
px, en, g = warren_gcps(); S = SheetTransform(sheet)
pred = S.warren_to_scan(px); idx = {x['id']: i for i, x in enumerate(g)}
rows = []
for r in H['readings']:
    i = idx[r['gcp_id']]; read = pred[i] + np.array(r['offset_px'])
    rows.append(dict(gcp_id=r['gcp_id'], name=g[i]['name'], kind=g[i]['kind'], scan_px=read.round(1).tolist(), ground_en=en[i].tolist(), sigma_read_px=r['sigma_px'], offset_px=r['offset_px'], pred_px=pred[i].round(1).tolist()))
P = np.array([r['scan_px'] for r in rows]); E = np.array([r['ground_en'] for r in rows]); n = len(rows)
# (R) chain of record evaluated at the hand-read points
chainEN = S.scan_to_en(P); resR = chainEN - E; dR = np.linalg.norm(resR, axis=1)
# warren affine applied to the warren px of the same GCPs (the Warren sheet's own error at these points)
wi = [idx[r['gcp_id']] for r in rows]; wEN = (S.A @ px[wi].T).T + S.t; dW = np.linalg.norm(wEN - E, axis=1)
# (D) direct affine from hand-read points
m, fit, loo = georef.evaluate(P, E, 'affine')
resD = m(P) - E
out = dict(map_id=f'bachelder-1876-sheet-{sheet}', scan=S.T['scan'], crs='EPSG:32618', n_points=n, points=rows,
  chain_of_record=dict(model=S.T['model'], rmse_at_points_m=round(georef.rms(dR), 2), median_m=round(float(np.median(dR)), 2), max_m=round(float(dR.max()), 2),
     note='chain (TPS scan->Warren px, Warren affine) evaluated at the hand-read scan positions vs the ground coordinate of the matching Warren GCP; contains Warren absolute error + Bachelder relative error + my reading error'),
  warren_at_same_points=dict(rmse_m=round(georef.rms(dW), 2), median_m=round(float(np.median(dW)), 2), max_m=round(float(dW.max()), 2), note='Warren affine applied to the Warren-px of the same GCPs (in-sample for the 23-point fit)'),
  direct_affine=dict(fit_rmse_m=round(georef.rms(fit), 2), loo_rmse_m=round(georef.rms(loo), 2), loo_median_m=round(float(np.median(loo)), 2), loo_max_m=round(float(loo.max()), 2),
     coef=dict(A=m.coef.tolist(), c=m.c.tolist(), s=m.s, dc=m.dc.tolist(), ds=m.ds), per_point=[dict(id=r['gcp_id'], fit_m=round(float(f), 2), loo_m=round(float(l), 2), resid_en_m=[round(float(a), 1) for a in rr]) for r, f, l, rr in zip(rows, fit, loo, resD)]),
  reading_sigma_px=float(np.sqrt(np.mean([r['sigma_read_px']**2 for r in rows]))),
  per_point_chain=[dict(id=r['gcp_id'], chain_resid_m=[round(float(a), 1) for a in rr], dist_m=round(float(d), 1)) for r, rr, d in zip(rows, resR, dR)])
_n = {'a': 1, 'b': 2, 'c': 3}[sheet]
json.dump(out, open(os.path.join(OUT, 'transform_direct_affine_check_sheet%d.json' % _n), 'w'), indent=1)
print('n', n, 'chain@pts rmse', out['chain_of_record']['rmse_at_points_m'], 'warren@pts', out['warren_at_same_points']['rmse_m'], 'direct fit', out['direct_affine']['fit_rmse_m'], 'LOO', out['direct_affine']['loo_rmse_m'], 'max', out['direct_affine']['loo_max_m'])
for r, d, l in zip(rows, dR, loo): print(r['gcp_id'], r['name'][:28], 'chain', round(float(d), 1), 'loo', round(float(l), 1))
