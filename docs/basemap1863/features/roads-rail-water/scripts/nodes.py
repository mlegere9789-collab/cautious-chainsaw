import json, os, sys
from collections import defaultdict
sys.path.insert(0, os.path.dirname(__file__))
from common import *
def junctions(minrank=3):
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    ends = defaultdict(set)
    for f in t['features']:
        c = f['geometry']['coordinates']
        for e in (c[0], c[-1]): ends[(round(e[0], 6), round(e[1], 6))].add((f['properties']['name'] or '-') + '|' + f['properties']['mtfcc'])
    out = []
    for k, v in ends.items():
        if len(v) >= 2 or True:
            out.append((k, sorted(v)))
    return out
