"""Geometry helpers: load TIGER/NHD/OSM, select, merge, clip, simplify, write GeoJSON (EPSG:4326 and EPSG:3857)."""
import json, os, math, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from shapely.geometry import LineString, MultiLineString, Point, Polygon, box, mapping, shape
from shapely.ops import unary_union, linemerge, transform as shp_transform
_tiger = None; _nhd = None; _osm = None
def tiger():
    global _tiger
    if _tiger is None: _tiger = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))['features']
    return _tiger
def osm():
    global _osm
    if _osm is None: _osm = {e['id']: e for e in json.load(open(os.path.join(CACHE, 'osm_hw.json')))['elements']}
    return _osm
def osm_fence():
    return {e['id']: e for e in json.load(open(os.path.join(CACHE, 'osm_fence.json')))['elements']}
def osm_coords(e): return [(p['lon'], p['lat']) for p in e['geometry']]
XBOX = box(XW, XS, XE, XN)
def tiger_lines(names=None, ids=None, mtfcc=None):
    out = []
    for f in tiger():
        p = f['properties']
        if names is not None and (p['name'] or '') not in names: continue
        if ids is not None and p['linearid'] not in ids: continue
        if mtfcc is not None and p['mtfcc'] not in mtfcc: continue
        out.append((p, LineString(f['geometry']['coordinates'])))
    return out
def merge_lines(geoms, clip=None, tol_m=1.5):
    """Union of overlapping/duplicate line geometries, merged to continuous lines; clip to a shapely geometry (lng/lat)."""
    gs = []
    for g in geoms:
        gg = g.intersection(clip) if clip is not None else g
        if gg.is_empty: continue
        gs.append(gg)
    if not gs: return None
    # snap duplicates: round coordinates to ~1 m grid before union
    def snap(g):
        if g.geom_type == 'LineString': return LineString([(round(x, 6), round(y, 6)) for x, y in g.coords])
        if g.geom_type == 'MultiLineString': return MultiLineString([snap(h) for h in g.geoms])
        return g
    u = unary_union([snap(g) for g in gs])
    try: m = linemerge(u)
    except Exception: m = u
    return m
def length_m(g):
    if g is None: return 0.0
    if g.geom_type == 'LineString': return line_len(list(g.coords))
    return sum(line_len(list(h.coords)) for h in g.geoms)
def to_merc(geom):
    return shp_transform(lambda x, y, z=None: tuple(ll2wm(x, y)), geom)
def round_geom(gm, nd=6):
    def rc(c): return [round(c[0], nd), round(c[1], nd)]
    t = gm['type']
    if t == 'Point': gm['coordinates'] = rc(gm['coordinates'])
    elif t == 'LineString': gm['coordinates'] = [rc(c) for c in gm['coordinates']]
    elif t == 'MultiLineString': gm['coordinates'] = [[rc(c) for c in l] for l in gm['coordinates']]
    elif t == 'Polygon': gm['coordinates'] = [[rc(c) for c in r] for r in gm['coordinates']]
    elif t == 'MultiPolygon': gm['coordinates'] = [[[rc(c) for c in r] for r in p] for p in gm['coordinates']]
    return gm
def write_fc(path, feats, name):
    fc = {'type': 'FeatureCollection', 'name': name, 'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'}}, 'features': feats}
    json.dump(fc, open(path, 'w'), separators=(',', ':'))
def write_pair(basepath, feats, name):
    """write EPSG:4326 file and a Web Mercator (EPSG:3857) copy."""
    write_fc(basepath + '.geojson', feats, name)
    mf = []
    for f in feats:
        g = shape(f['geometry']); gm = to_merc(g); m = dict(f); m['geometry'] = mapping(gm)
        m['geometry'] = round_geom(json.loads(json.dumps(m['geometry'])), 1)
        mf.append(m)
    fc = {'type': 'FeatureCollection', 'name': name + '_epsg3857', 'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:EPSG::3857'}}, 'features': mf}
    json.dump(fc, open(basepath + '.mercator.geojson', 'w'), separators=(',', ':'))
