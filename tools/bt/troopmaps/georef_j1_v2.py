"""georef_j1_v2.py : July 1 georeferences (2026-10-21).
Sheet 1 (Bachelder 1876, cw0325000a): transform of record = the roads-task registration (base affine + smooth displacement field fitted to 23 Warren GCPs and 26 hand-read road lines, docs/basemap1863/features/roads-rail-water/registration_sheet_a.json),
  validated against independent hand-read surviving-building controls (hand_gt_a.json, ground truth = 2023 Adams County outlines): NOT fitted to them.
LOC 99447494 : direct affine px -> UTM18N fitted to 12 hand-read controls of hand_gt_loc94.json with leave-one-out.
Writes terrain/troopmaps/transform_bachelder1876_sheet1_j1.json, gcps_bachelder1876_sheet1_j1.json, transform_loc99447494_july1_v2.json, gcps_loc99447494_july1_v2.json"""
import json, numpy as np, os
from common_tm import *
import fieldmodel_a as FM
D = os.path.dirname(__file__)
G = {g['id']: g for g in json.load(open(os.path.join(D, 'gt_j1.json')))}
# ---- sheet 1 ----
Hs = json.load(open(os.path.join(D, 'hand_gt_a.json'))); S = SheetTransform('a'); rows = []
for p in Hs['points']:
    g = G[p['gt']]; px = np.array(p['scan_px'], float)
    fe = FM.scan_to_en(*px); ce = S.scan_to_en(px[None])[0]; gt = np.array([g['E'], g['N']])
    rows.append(dict(id=p['gt'], name=g['name'], gt_en=[g['E'], g['N']], sigma_gt_m=g['sigma_gt_m'], scan_px=p['scan_px'], sigma_read_px=p['sigma_read_px'], used=p.get('use', True), note=p['note'],
        field_model_err_m=round(float(np.hypot(*(fe - gt))), 1), field_err_en=[round(float(x), 1) for x in (fe - gt)], chain_err_m=round(float(np.hypot(*(ce - gt))), 1), chain_err_en=[round(float(x), 1) for x in (ce - gt)]))
ind = [r for r in rows if r['used'] and r['id'] not in ('W014', 'W015')]   # W014/W015 are Warren GCPs in the field fit: not independent
em = [r['field_model_err_m'] for r in ind]; ec = [r['chain_err_m'] for r in ind]
R = json.load(open(os.path.join(ROOT, 'docs/basemap1863/features/roads-rail-water/registration_sheet_a.json')))
out1 = dict(map_id='bachelder-1876-sheet1-july1', scan='cw0325000a.jp2 (LOC 99447491, sheet 1, First day), full-resolution px; the roads-task field is on the 50% render: px50 = scan/2', crs='EPSG:32618',
    model='ground EN -> px50 = base affine + bilinear displacement field (450 px grid) [docs/basemap1863/features/roads-rail-water/registration_sheet_a.json]; scan->EN by Newton inversion (tools/bt/troopmaps/fieldmodel_a.py)',
    source_registration=dict(file='docs/basemap1863/features/roads-rail-water/registration_sheet_a.json', constraints=R['constraints'], leave_one_out_m=R['leave_one_out_m'], fit_residual_m=R['fit_residual_m'], caveats=R['caveats']),
    committed_chain_for_comparison='docs/basemap1863/maps/transforms/bachelder-1876-sheet1.json (TPS to Warren px + Warren affine): the same hand-read buildings are 70-138 m out in the north-west with the chain',
    independent_validation=dict(n=len(ind), field_model_rms_m=round(float(np.sqrt(np.mean(np.square(em)))), 1), field_model_median_m=round(float(np.median(em)), 1), field_model_max_m=round(float(max(em)), 1),
        chain_rms_m=round(float(np.sqrt(np.mean(np.square(ec)))), 1), points_used='single-building reads McLean barn, McLean house, Pennsylvania Hall; ambiguous identifications (Schmucker Hall, Black Horse Tavern) are excluded and listed',
        cluster_level_checks='McPherson, Shultz and McMillan symbol clusters, Thompson house area: the county building outlines drawn through the field model fall inside the printed symbol clusters, 10-25 px (about 10-25 m) from the cluster centres (tmp view vecover.py af; not tabulated as numbers)'),
    honest_bound='1-sigma about 30 m over Seminary Ridge / McPherson Ridge / Oak Ridge south of McLean farm / the town and east to Rock Creek. Beyond it (Herr Ridge and the far west, the north beyond McLean farm, east of Rock Creek) not quantified: use 50 m.',
    points=rows)
json.dump(out1, open(os.path.join(OUT, 'transform_bachelder1876_sheet1_j1.json'), 'w'), indent=1)
json.dump(dict(method=Hs['method'], points=rows), open(os.path.join(OUT, 'gcps_bachelder1876_sheet1_j1.json'), 'w'), indent=1)
print('sheet1 independent n', len(ind), 'field rms', out1['independent_validation']['field_model_rms_m'], 'chain rms', out1['independent_validation']['chain_rms_m'])
# ---- LOC94 ----
Hl = json.load(open(os.path.join(D, 'hand_gt_loc94.json'))); pts = [p for p in Hl['points'] if p.get('use', True)]
P = np.array([p['scan_px'] for p in pts], float); E = np.array([[G[p['gt']]['E'], G[p['gt']]['N']] for p in pts])
m, fit, loo = georef.evaluate(P, E, 'affine'); a = m(np.array([[0, 0], [1000, 0], [0, 1000]], float))
out2 = dict(map_id='loc-99447494-july1-2to330pm', scan_file='tmp/library/troopmaps/commons_LOC99447494_july1_2to330pm.jpg', crs='EPSG:32618', model='affine map px -> UTM18N (georef.Model, normalised), fitted to %d hand-read controls' % len(P),
    coef=dict(A=m.coef.tolist(), c=m.c.tolist(), s=m.s, dc=m.dc.tolist(), ds=m.ds),
    pairs=[dict(id=p['gt'], map_px=p['scan_px'], en=E[i].tolist(), fit_m=round(float(fit[i]), 1), loo_m=round(float(loo[i]), 1), note=p['note']) for i, p in enumerate(pts)],
    accuracy=dict(n=len(P), fit_rmse_m=round(georef.rms(fit), 1), loo_rmse_m=round(georef.rms(loo), 1), loo_median_m=round(float(np.median(loo)), 1), loo_max_m=round(float(loo.max()), 1),
                  m_per_px=[round(float(np.linalg.norm(a[1] - a[0]) / 1000), 3), round(float(np.linalg.norm(a[2] - a[0]) / 1000), 3)],
                  previous_preliminary_loo_m=48.8, honest_bound='about 40 m (1 sigma) in the control region (px x 1760-3270, y 790-3730); the west of the sheet (x < 1700, Herr Ridge) and the far north and east have no hand control except the unused Black Horse Tavern; treat as 60 m there'),
    method=Hl['method'], status='used for the hour-labelled July 1 claims, sigma 40 m transform')
json.dump(out2, open(os.path.join(OUT, 'transform_loc99447494_july1_v2.json'), 'w'), indent=1)
json.dump(Hl, open(os.path.join(OUT, 'gcps_loc99447494_july1_v2.json'), 'w'), indent=1)
print('loc94', out2['accuracy'])
