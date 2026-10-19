import numpy as np, json, sys, cv2
sys.path.insert(0, 'scripts')
from shapely import wkt
from shapely.ops import unary_union
from rasterize import rasterize
a = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'assembled_utm.json'))
d = np.load('chm_final.npz'); chm = d['chm']; mf = d['mf']
canopy = ((chm > 4) & (mf > 0.08)).astype(np.float32)
polys = [wkt.loads(w).buffer(0) for n, w in a['woods']]
allw = unary_union(polys)
big = [p for p in (allw.geoms if allw.geom_type == 'MultiPolygon' else [allw]) if p.area > 20000]
print('big woodland components', len(big))
R = 2.0
def contrast(dx, dy, comps, sub=None):
    inside = rasterize(comps, dx=dx, dy=dy).astype(bool)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))   # 20 m ring
    dil = cv2.dilate(inside.astype(np.uint8), k).astype(bool)
    allm = rasterize([allw], dx=dx, dy=dy).astype(bool)
    ring = dil & ~inside & ~cv2.dilate(allm.astype(np.uint8), k).astype(bool) if False else dil & ~inside & ~allm
    er = cv2.erode(inside.astype(np.uint8), k).astype(bool)
    if ring.sum() < 500 or er.sum() < 500: return None
    return canopy[er].mean(), canopy[ring].mean(), er.sum(), ring.sum()
res = {}
best = None
for dx in range(-60, 61, 6):
    for dy in range(-60, 61, 6):
        c = contrast(dx, dy, big)
        if c is None: continue
        s = c[0] - c[1]
        res[(dx, dy)] = (s, c[0], c[1])
        if best is None or s > best[0]: best = (s, dx, dy, c)
z = res[(0, 0)]
print('zero shift: inside canopy frac %.3f ring %.3f contrast %.3f' % (z[1], z[2], z[0]))
print('best shift dE(m)=%d dN(m)=%d: inside %.3f ring %.3f contrast %.3f' % (best[1], best[2], best[3][0], best[3][1], best[0]))
json.dump({'zero': z, 'best': [best[1], best[2], best[0], best[3][0], best[3][1]]}, open('regcheck2.json', 'w'))
