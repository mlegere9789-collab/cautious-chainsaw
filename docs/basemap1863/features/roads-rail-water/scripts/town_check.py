"""Pass 4c: street plan of the 1863 borough. For each TIGER edge whose centroid is inside the borough footprint, the 'street-gap contrast' is measured on sheet 'a':
streets are drawn as pale gaps between the black house blocks, so the mean grey level along the centre line minus the mean grey level at +-9 px either side is positive for a street.
Calibration: the edges of the streets that the NPS and the ten-road list place in 1863 (Baltimore, Washington, Chambersburg, York, Hanover, Carlisle, Middle St) give the 'street' distribution;
the same edges shifted 6 px (12 m) sideways give the 'not street' distribution. Threshold = midpoint of the two medians; an edge is 'street drawn' above it."""
import sys, os, json, math
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from icp import MAPS, map_coordinates
from common import *
import regtf
from shapely.geometry import shape, box
def contrast(af, g, G, shift=0.0, off=9.0):
    xy = [ll2m(*c[:2]) for c in g.coords]; vals = []; acc = 0; nxt = 0
    for i in range(len(xy) - 1):
        (x1, y1), (x2, y2) = xy[i], xy[i + 1]; L = math.hypot(x2 - x1, y2 - y1)
        if L < 1e-6: continue
        tx, ty = (x2 - x1) / L, (y2 - y1) / L
        while nxt <= acc + L:
            t = (nxt - acc) / L; E = x1 + (x2 - x1) * t; N = y1 + (y2 - y1) * t; nxt += 6.0
            p = np.array(af.en2px(E, N)); tp = af.jac_tangent(E, N, tx, ty); nr = np.array([-tp[1], tp[0]]); q = p + shift * nr
            c = map_coordinates(G, [[q[1]], [q[0]]], order=1)[0]; a = map_coordinates(G, [[q[1] + off * nr[1]], [q[0] + off * nr[0]]], order=1)[0]; b = map_coordinates(G, [[q[1] - off * nr[1]], [q[0] - off * nr[0]]], order=1)[0]
            vals.append(c - 0.5 * (a + b))
        acc += L
    return float(np.mean(vals)) if vals else None, len(vals)
if __name__ == '__main__':
    af = regtf.FieldTF(); G = cv2.GaussianBlur(cv2.imread(os.path.join(MAPS, 'bach1879_a.50.jpg'), cv2.IMREAD_GRAYSCALE).astype(np.float32), (0, 0), 1.2)
    tig = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))['features']
    TOWN = box(-77.2380, 39.8240, -77.2240, 39.8345)
    cal_names = {'Baltimore St', 'S Washington St', 'N Washington St', 'Chambersburg St', 'York St', 'Hanover St', 'Carlisle St', 'W Middle St', 'E Middle St', 'W High St', 'E High St', 'N Stratton St', 'S Stratton St', 'N Franklin St', 'S Franklin St', 'Lincoln Sq'}
    pos = []; neg = []
    for f in tig:
        p = f['properties']
        if (p['name'] or '') in cal_names:
            g = shape(f['geometry']); c = g.intersection(TOWN)
            if c.is_empty or c.length * 85000 < 80: continue
            for geom in ([c] if c.geom_type == 'LineString' else list(c.geoms)):
                if geom.length * 85000 < 60: continue
                a, n = contrast(af, geom, G); pos.append(a)
                b = np.mean([contrast(af, geom, G, shift=s)[0] for s in (-7, 7)]); neg.append(b)
    pos = np.array([x for x in pos if x is not None]); neg = np.array([x for x in neg if x is not None])
    thr = float((np.median(pos) + np.median(neg)) / 2)
    print('calibration: n', len(pos), 'street median', round(float(np.median(pos)), 1), 'shifted median', round(float(np.median(neg)), 1), 'threshold', round(thr, 1))
    res = {}
    for f in tig:
        p = f['properties']; g = shape(f['geometry'])
        if not TOWN.contains(g.centroid): continue
        if p['mtfcc'] not in ('S1200', 'S1400', 'S1730'): continue
        if g.length * 85000 < 40: res[p['linearid']] = dict(verdict='too short'); continue
        a, n = contrast(af, g, G); b = np.mean([contrast(af, g, G, shift=s)[0] for s in (-7, 7)])
        res[p['linearid']] = dict(contrast=round(a, 1), shifted=round(float(b), 1), name=p['name'], verdict=('street drawn' if (a >= thr and a - b > 8) else 'not drawn'))
    import collections
    print(collections.Counter(v['verdict'] for v in res.values()))
    json.dump(dict(method=__doc__, calibration=dict(n=len(pos), street_median=float(np.median(pos)), shifted_median=float(np.median(neg)), threshold=thr), results=res), open(os.path.join(OUT, 'verification', 'pass4c_town.json'), 'w'), indent=1)
