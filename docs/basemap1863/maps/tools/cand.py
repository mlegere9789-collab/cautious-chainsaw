"""Candidate ground control points: intersections of named TIGER roads (modern), saved to tmp/b1863/maps/ref/road_nodes.json."""
import json, itertools, os
from shapely.geometry import shape, LineString
from shapely.strtree import STRtree
from common import *
feats = []
for n in ['tiger_primary', 'tiger_secondary', 'tiger_local']:
    for f in json.load(open(os.path.join(TMP, 'ref', n + '.geojson')))['features']:
        g = shape(f['geometry'])
        if g.geom_type == 'MultiLineString':
            for p in g.geoms: feats.append((f['properties'].get('NAME'), p))
        else: feats.append((f['properties'].get('NAME'), g))
geoms = [g for _, g in feats]; tree = STRtree(geoms); out = []
for i, (nm, g) in enumerate(feats):
    for j in tree.query(g):
        if j <= i: continue
        nm2, g2 = feats[j]
        if nm == nm2: continue
        x = g.intersection(g2)
        pts = [x] if x.geom_type == 'Point' else [p for p in getattr(x, 'geoms', []) if p.geom_type == 'Point']
        for p in pts: out.append(dict(a=nm, b=nm2, e=round(p.x, 1), n=round(p.y, 1)))
# de-duplicate within 15 m for same name pair
res = []
for o in out:
    if not any(abs(o['e'] - r['e']) < 15 and abs(o['n'] - r['n']) < 15 and {o['a'], o['b']} == {r['a'], r['b']} for r in res): res.append(o)
json.dump(res, open(os.path.join(TMP, 'ref', 'road_nodes.json'), 'w'))
print(len(res))
