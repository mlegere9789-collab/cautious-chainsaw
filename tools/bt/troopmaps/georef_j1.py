"""georef_j1.py : affine georeference of LOC 99447494 (July 1, 2 to 3.30 p.m.) from hand_pairs_j1.json; writes terrain/troopmaps/transform_loc99447494_july1.json"""
import json, numpy as np, os
from common_tm import *
d = json.load(open(os.path.join(os.path.dirname(__file__), 'hand_pairs_j1.json')))
P = np.array([p['map_px'] for p in d['pairs']], float); E = np.array([p['en'] for p in d['pairs']], float)
m, fit, loo = georef.evaluate(P, E, 'affine')
loo_no1 = None
k = np.array([p['id'] != 'J01' for p in d['pairs']]); m2, f2, l2 = georef.evaluate(P[k], E[k], 'affine')
a = m(np.array([[0, 0], [1000, 0], [0, 1000]], float))
out = dict(map_id='loc-99447494-july1-2to330pm', scan_file='tmp/library/troopmaps/commons_LOC99447494_july1_2to330pm.jpg', crs='EPSG:32618', model='affine map px -> UTM18N, 11 hand pairs against the georeferenced Warren raster',
  pairs=[dict(id=p['id'], name=p['name'], map_px=p['map_px'], en=p['en'], fit_m=round(float(f), 1), loo_m=round(float(l), 1)) for p, f, l in zip(d['pairs'], fit, loo)],
  coef=dict(A=m.coef.tolist(), c=m.c.tolist(), s=m.s, dc=m.dc.tolist(), ds=m.ds),
  accuracy=dict(n=len(P), fit_rmse_m=round(georef.rms(fit), 1), loo_rmse_m=round(georef.rms(loo), 1), loo_median_m=round(float(np.median(loo)), 1), loo_max_m=round(float(loo.max()), 1),
                m_per_px=[round(float(np.linalg.norm(a[1] - a[0]) / 1000), 3), round(float(np.linalg.norm(a[2] - a[0]) / 1000), 3)],
                without_J01_post_hoc=dict(fit_rmse_m=round(georef.rms(f2), 1), loo_rmse_m=round(georef.rms(l2), 1), note='J01 was dropped after seeing its residual (62 m): shown for information only, NOT adopted'),
                honest_bound='about 50 m (1 sigma) in the control-point region (x 1300-3450, y 1050-2250 of the scan); worse outside it (Oak Ridge, Cemetery Ridge south end, not controlled)'),
  method=d['method'], status='PRELIMINARY; not used for any claim')
json.dump(out, open(os.path.join(OUT, 'transform_loc99447494_july1.json'), 'w'), indent=1)
json.dump(d, open(os.path.join(OUT, 'gcps_loc99447494_july1.json'), 'w'), indent=1)
print(out['accuracy'])
