import shapefile, os, itertools, collections
from pyproj import Transformer
from shapely.geometry import shape, Point, box
from shapely.ops import unary_union
T = Transformer.from_crs(4326, 32618, always_xy=True)
Ti = Transformer.from_crs(32618, 4326, always_xy=True)
sf = shapefile.Reader('tiger/x/' + [x for x in os.listdir('tiger/x') if x.endswith('.shp')][0])
bb = box(-77.30, 39.765, -77.17, 39.875)
roads = collections.defaultdict(list)
for sr in sf.iterShapeRecords():
    g = shape(sr.shape.__geo_interface__)
    if g.intersects(bb): roads[sr.record['FULLNAME']].append(g)
U = {k: unary_union(v) for k, v in roads.items() if k}
if __name__ == '__main__':
    names = sorted(U)
    print(len(names))
    for a, b in itertools.combinations(names, 2):
        i = U[a].intersection(U[b])
        if i.is_empty: continue
        pts = [i] if i.geom_type == 'Point' else [p for p in getattr(i, 'geoms', []) if p.geom_type == 'Point']
        for p in pts:
            x, y = T.transform(p.x, p.y)
            if 303000 < x < 314500 and 4404200 < y < 4416200: print(f'{a} | {b} | {p.x:.6f},{p.y:.6f} | utm {x:.1f},{y:.1f}')
