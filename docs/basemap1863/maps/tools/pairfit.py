"""Refine a derived-map registration from dense match pairs (scan px -> Warren px): compare affine / poly3 / thin-plate by 5-fold cross-validation and
write the model (as a sampled displacement grid for non-affine) into the reg json.  python pairfit.py reg.json"""
import sys, json, numpy as np
from scipy.interpolate import RBFInterpolator
import georef
from georef import _terms
def cv(a, r, kind, smooth=0.0, k=5, seed=0):
    rng = np.random.default_rng(seed); idx = rng.permutation(len(a)); folds = np.array_split(idx, k); err = []
    for f in folds:
        tr = np.setdiff1d(idx, f)
        m = georef.Model(kind, smooth).fit(a[tr], r[tr]); err += list(np.linalg.norm(m(a[f]) - r[f], axis=1))
    return float(np.sqrt(np.mean(np.square(err)))), float(np.median(err))
if __name__ == '__main__':
    p = sys.argv[1]; j = json.load(open(p)); a = np.array(j['pairs']['a']); r = np.array(j['pairs']['r'])
    res = {}
    for kind, s in (('affine', 0), ('poly2', 0), ('poly3', 0), ('tps', 3.0), ('tps', 30.0)):
        if len(a) < 40 and kind != 'affine' and kind != 'poly2': continue
        res['%s_%g' % (kind, s)] = cv(a, r, kind, s)
        print(kind, s, [round(v, 2) for v in res['%s_%g' % (kind, s)]])
    j['cv'] = res; json.dump(j, open(p, 'w'))
