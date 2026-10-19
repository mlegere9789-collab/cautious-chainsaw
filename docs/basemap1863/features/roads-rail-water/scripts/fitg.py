import sys, json, math, os
sys.path.insert(0, os.path.dirname(__file__))
from georef import *
def run(name, g, check=()):
    af, res = fit_affine(g); M = af.M
    print(name, 'resid m', [round(r, 1) for r in res])
    print(' scale', round(1 / math.hypot(M[0, 0], M[1, 0]), 3), round(1 / math.hypot(M[0, 1], M[1, 1]), 3), 'rot', round(math.degrees(math.atan2(M[1, 0], M[0, 0])), 2), round(math.degrees(math.atan2(-M[0, 1], -M[1, 1])), 2))
    json.dump({'M': M.tolist(), 'gcps': g}, open(os.path.join(ROOT, 'tmp/b1863/roads', f'tf_{name}.json'), 'w'))
    for nm, (lng, lat) in check:
        print('  pred', nm, [round(v) for v in af.ll2px(lng, lat)])
    return af
