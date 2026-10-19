"""Record junction control points from a nodes_view station.
python pick_nodes.py <gcps.json> <station.png> <prefix> "NNNN:dx,dy:name:evidence" ...
(dx,dy = display px, LEFT panel, from the node circle to the 1863 junction; the left circle is drawn at the model-predicted scan position)"""
import sys, json, os
from common import *
import georef
gp, st, prefix = sys.argv[1:4]
J = json.load(open(st + '.json')); nodes = {x['id']: x for x in json.load(open(os.path.join(TMP, 'ref', 'road_nodes.json')))}
d = json.load(open(gp))
# reconstruct the model used for the view from the station sidecar: predicted px = from sidecar mapping is lost, so recompute from the saved model params
pred = json.load(open(st + '.pred.json')) if os.path.exists(st + '.pred.json') else None
for spec in sys.argv[4:]:
    nid, dd, name, ev = spec.split(':', 3)
    x = nodes['N' + nid]; dx, dy = map(float, dd.split(','))
    px0, py0 = pred[x['id']]
    px = [px0 + dx / J['sc'], py0 + dy / J['sc']]
    n = len([g for g in d['gcps'] if g['id'].startswith(prefix)]) + 1
    gid = '%s%03d' % (prefix, n)
    d['gcps'].append(dict(id=gid, name=name, kind='road-junction', px=[round(px[0], 1), round(py0 + dy / J['sc'], 1)], en=[x['e'], x['n']], note=ev, node=x['id'], tiger=[x['a'], x['b']], station=os.path.basename(st)))
    print(gid, x['id'], px, x['e'], x['n'])
json.dump(d, open(gp, 'w'), indent=1)
