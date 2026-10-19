import shapefile, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
r = shapefile.Reader(os.path.join(CACHE, 'roads42001', 'tl_2023_42001_roads'))
feats = []
for sr in r.iterShapeRecords():
    b = sr.shape.bbox
    if b[2] < XW or b[0] > XE or b[3] < XS or b[1] > XN: continue
    d = sr.record.as_dict()
    parts = list(sr.shape.parts) + [len(sr.shape.points)]
    for i in range(len(parts) - 1):
        pts = [list(p) for p in sr.shape.points[parts[i]:parts[i + 1]]]
        feats.append({'type': 'Feature', 'properties': {'linearid': d['LINEARID'], 'name': d['FULLNAME'], 'mtfcc': d['MTFCC']},
                      'geometry': {'type': 'LineString', 'coordinates': pts}})
json.dump({'type': 'FeatureCollection', 'features': feats}, open(os.path.join(CACHE, 'tiger_roads_bbox.geojson'), 'w'))
print(len(feats))
