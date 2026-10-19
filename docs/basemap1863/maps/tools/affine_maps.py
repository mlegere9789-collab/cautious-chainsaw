"""Affine transforms (scan px -> UTM 18N) for maps georeferenced directly from GCP files: hopkins_inset, hopkins_county, hotchkiss.
Writes transforms/<id>.json with fit RMSE and leave-one-out RMSE."""
import os, json, numpy as np
from common import *
import georef
OUTT = os.path.join(OUT, 'transforms')
SPECS = {
 'hopkins-1858-gettysburg-inset': dict(gcp='hopkins_inset.json', title='Map of Adams Co., Pennsylvania (Hopkins; Converse 1858), Gettysburg borough inset', url='https://www.loc.gov/item/2004629149/', scan='la000697.jp2',
     valid='Gettysburg borough street grid only (about 0.8 x 0.6 km around the Diamond). Extrapolation beyond the control points is untested.', grade='A: usable for tracing the 1858-1863 street grid and building footprints in the borough (error about 3 m between the control points).'),
 'hopkins-1858-county': dict(gcp='hopkins_county.json', title='Map of Adams Co., Pennsylvania (Hopkins; Converse 1858), county sheet', url='https://www.loc.gov/item/2004629149/', scan='la000697.jp2',
     valid='county-scale only', grade='D: NOT usable for tracing. About 375 m leave-one-out error, from village dots read to +-200 m against GNIS points that are not exact village centres. Useful for place names, owners and which settlements and roads existed in 1858.'),
 'hotchkiss-jacobs': dict(gcp='hotchkiss.json', title='Map of the battle field of Gettysburg [Hotchkiss copy of the Jacobs map, 1863; LOC edition 1888?]', url='https://www.loc.gov/item/99439128/', scan='cw0340000.jp2',
     valid='southern battlefield only (5 control points between Peach Orchard and Little Round Top)', grade='D: NOT usable for tracing. A sketch: rotation and scale are inconsistent between control points (residuals 20-270 m). Useful only as testimony about which buildings and orchards existed.'),
}
for mid, sp in SPECS.items():
    d, px, en, g = georef.load_gcps(os.path.join(OUT, 'gcps', sp['gcp']))
    A = np.c_[px, np.ones(len(px))]; sol = np.linalg.lstsq(A, en, rcond=None)[0]; res = np.linalg.norm(A @ sol - en, axis=1)
    loo = []
    for i in range(len(px)):
        k = np.arange(len(px)) != i; s = np.linalg.lstsq(A[k], en[k], rcond=None)[0]; loo.append(float(np.linalg.norm(A[i] @ s - en[i])))
    M = sol[:2].T; t = sol[2]; Mi = np.linalg.inv(M)
    out = dict(map_id=mid, title=sp['title'], loc_item=sp['url'], scan=sp['scan'], crs=CRS, gcp_file='docs/basemap1863/maps/gcps/' + sp['gcp'], n_gcps=len(px), model='affine',
               px_to_en=dict(A=M.tolist(), t=t.tolist(), note='E,N = A @ [x,y] + t'), en_to_px=dict(A=Mi.tolist(), t=(-Mi @ t).tolist()),
               scale_m_per_px=[float(np.hypot(*M[:, 0])), float(np.hypot(*M[:, 1]))],
               accuracy=dict(fit_rmse_m=round(float(np.sqrt(np.mean(res ** 2))), 2), loo_rmse_m=round(float(np.sqrt(np.mean(np.square(loo)))), 2), loo_max_m=round(float(max(loo)), 2), loo_median_m=round(float(np.median(loo)), 2)),
               valid_region=sp['valid'], grade=sp['grade'],
               residuals=[dict(id=x['id'], name=x['name'], resid_m=round(float(r), 1), loo_m=round(l, 1)) for x, r, l in zip(g, res, loo)])
    json.dump(out, open(os.path.join(OUTT, mid + '.json'), 'w'), indent=1); print(mid, out['accuracy'], out['scale_m_per_px'])
