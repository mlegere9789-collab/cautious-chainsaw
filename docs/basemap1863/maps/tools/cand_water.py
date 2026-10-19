"""Road x stream crossings (bridges/fords): NHD flowlines x TIGER roads, saved to ref/water_nodes.json (ids B####) and merged into road_nodes-style list."""
import json, os
from shapely.geometry import shape
from shapely.strtree import STRtree
from common import *
roads = []
for n in ['tiger_primary', 'tiger_secondary', 'tiger_local']:
    for f in json.load(open(os.path.join(TMP, 'ref', n + '.geojson')))['features']:
        g = shape(f['geometry']); gs = list(g.geoms) if g.geom_type == 'MultiLineString' else [g]
        for p in gs: roads.append((f['properties'].get('NAME'), p))
tree = STRtree([g for _, g in roads]); out = []
for f in json.load(open(os.path.join(TMP, 'ref', 'nhd_flowline.geojson')))['features']:
    g = shape(f['geometry']); gs = list(g.geoms) if g.geom_type == 'MultiLineString' else [g]
    nm = f['properties'].get('gnis_name')
    for s in gs:
        for j in tree.query(s):
            x = s.intersection(roads[j][1]); pts = [x] if x.geom_type == 'Point' else [p for p in getattr(x, 'geoms', []) if p.geom_type == 'Point']
            for p in pts: out.append(dict(a=roads[j][0], b=nm or 'stream', e=round(p.x, 1), n=round(p.y, 1)))
res = []
for o in out:
    if not any(abs(o['e'] - r['e']) < 20 and abs(o['n'] - r['n']) < 20 for r in res): res.append(o)
for i, r in enumerate(res): r['id'] = 'B%04d' % i
json.dump(res, open(os.path.join(TMP, 'ref', 'water_nodes.json'), 'w'))
print(len(res))
for r in res:
    if 303700 < r['e'] < 312300 and 4405800 < r['n'] < 4414600 and r['b'] != 'stream' or (r['a'] in ('US Hwy 30', 'Baltimore Pike', 'Taneytown Rd', 'Emmitsburg Rd', 'York Rd', 'Hanover Rd', 'Fairfield Rd', 'Chambersburg Rd', 'State Rte 97', 'State Rte 116', 'State Rte 34', 'Biglerville Rd', 'Old Harrisburg Rd') and 303700 < r['e'] < 312300 and 4405800 < r['n'] < 4414600):
        print(r['id'], r['a'], '|', r['b'], int(r['e']), int(r['n']))
