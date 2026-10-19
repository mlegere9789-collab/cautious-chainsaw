import json, sys, numpy as np
sys.path.insert(0, 'scripts')
import warp
from shapely import wkt
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import transform as stransform
def conv_poly(p):
    def f(ring):
        a = np.array(ring.coords); E, N = warp.px_to_utm(a[:, 0], a[:, 1]); return list(zip(E, N))
    return Polygon(f(p.exterior), [f(h) for h in p.interiors])
def conv(g):
    if g.geom_type == 'Polygon': return conv_poly(g)
    return MultiPolygon([conv_poly(p) for p in g.geoms if p.geom_type == 'Polygon'])
if __name__ == '__main__':
    a = json.load(open('assembled_px.json'))
    out = {}
    for k, lst in a.items():
        out[k] = [(n, conv(wkt.loads(w)).wkt) for n, w in lst]
    json.dump(out, open('assembled_utm.json', 'w'))
    print({k: len(v) for k, v in out.items()})
