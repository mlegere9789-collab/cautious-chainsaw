"""Build GeoJSON feature files for the 1863 land-cover reconstruction.
Inputs (all in Warren-map pixel space, digitised/extracted from the georeferenced Warren survey):
  assembled_px.json (auto + hand woods, orchards, marsh, scattered trees), manual.json (hand polygons)
Outputs: docs/basemap1863/features/landcover/*.geojson (+ *.3857.geojson)
"""
import json, sys, os, re, hashlib, datetime
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import warp
from shapely import wkt
from shapely.geometry import Polygon, MultiPolygon, mapping, shape
from shapely.ops import unary_union, transform as stransform
from pyproj import Transformer
from sources_reg import SRC
OUT = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'docs', 'basemap1863', 'features', 'landcover'); OUT = os.path.normpath(OUT)
os.makedirs(OUT, exist_ok=True)
U2L = Transformer.from_crs(32618, 4326, always_xy=True); U2M = Transformer.from_crs(32618, 3857, always_xy=True)
CORR = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'corr.json'))) if os.path.exists(os.path.join(os.path.dirname(__file__), '..', 'corr.json')) else {'dE': 0.0, 'dN': 0.0}
def px_poly_to_utm(g):
    def ring(r):
        a = np.array(r.coords); E, N = warp.px_to_utm(a[:, 0], a[:, 1]); return list(zip(E + CORR['dE'], N + CORR['dN']))
    ps = [g] if g.geom_type == 'Polygon' else [p for p in g.geoms if p.geom_type == 'Polygon']
    return MultiPolygon([Polygon(ring(p.exterior), [ring(h) for h in p.interiors]) for p in ps])
def clean(g, tol=1.2, minarea=80):
    g = g.buffer(0).simplify(tol, preserve_topology=True)
    ps = [g] if g.geom_type == 'Polygon' else [p for p in getattr(g, 'geoms', []) if p.geom_type == 'Polygon']
    ps = [p for p in ps if p.area >= minarea]
    return ps
def round_coords(geom, nd):
    def r(c): return [round(v, nd) for v in c]
    m = mapping(geom)
    def walk(x): return [walk(i) for i in x] if isinstance(x[0], (list, tuple)) else r(x)
    return {'type': m['type'], 'coordinates': walk(m['coordinates'])}
def write_fc(name, feats):
    fc = {'type': 'FeatureCollection', 'name': name, 'crs_note': 'GeoJSON RFC 7946: lon/lat WGS84 (EPSG:4326). A Web Mercator (EPSG:3857) copy is in the .3857.geojson file.', 'features': []}
    fm = {'type': 'FeatureCollection', 'name': name + '_3857', 'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:EPSG::3857'}}, 'features': []}
    for f in feats:
        gu = f.pop('_utm_geom') if '_utm_geom' in f else None
        if gu is None: fc['features'].append(f); continue
        gl = stransform(lambda x, y, z=None: U2L.transform(x, y), gu); gm = stransform(lambda x, y, z=None: U2M.transform(x, y), gu)
        a = {'type': 'Feature', 'id': f['id'], 'properties': {k: v for k, v in f.items() if k != 'geometry'}, 'geometry': round_coords(gl, 7)}
        b = {'type': 'Feature', 'id': f['id'], 'properties': {k: v for k, v in f.items() if k != 'geometry'}, 'geometry': round_coords(gm, 2)}
        fc['features'].append(a); fm['features'].append(b)
    for p, d in [(os.path.join(OUT, name + '.geojson'), fc), (os.path.join(OUT, name + '.3857.geojson'), fm)]:
        json.dump(d, open(p, 'w'), separators=(',', ':'))
    return len(fc['features'])

# ---------------------------------------------------------------- build
def load_px(): return json.load(open(os.path.join(os.path.dirname(__file__), '..', 'assembled_px.json')))
def load_manual(): return json.load(open(os.path.join(os.path.dirname(__file__), '..', 'manual.json')))
# Warren neatline (inner map frame) in pixel space; everything outside is not on the survey sheet
NEAT = Polygon([(352, 752), (8475, 752), (8475, 9485), (352, 9485)])
def densify(poly, step=100.0):
    pts = []; c = list(poly.exterior.coords)
    for (x0, y0), (x1, y1) in zip(c[:-1], c[1:]):
        n = max(1, int(np.hypot(x1 - x0, y1 - y0) / step))
        for k in range(n): pts.append((x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n))
    return Polygon(pts)
COVER_UTM = px_poly_to_utm(densify(NEAT))
ACRE = 4046.8564224
WARREN_SRC = lambda note: {'cite': SRC['S-WARREN']['cite'], 'sheet_or_page': 'single sheet, 1:12,000 (LC image cw0353500)', 'url': SRC['S-WARREN']['url'], 'type': 'A1', 'quote_or_paraphrase': note}
def src(key, loc, note):
    s = SRC[key]; return {'cite': s['cite'], 'sheet_or_page': loc, 'url': s['url'], 'type': s['type'], 'quote_or_paraphrase': note}
WARREN_LEGEND = 'Sheet legend (printed on the scan): every object is represented as near as possible as it was at the time of the battle. Tree-symbol areas = woods; the survey was nevertheless made in 1868-69 (revised 1873).'
def make(fid, cat, sub, name, g, pres, note, sources, method, err, conf, notes):
    return {'id': fid, 'category': cat, 'subtype': sub, 'name': name, 'present_1863': pres, 'period_note': note, 'sources': sources, 'method': method,
            'positional_error_m': err, 'confidence': conf, 'notes': notes, 'area_m2': round(g.area, 1), 'area_acres': round(g.area / ACRE, 2), '_utm_geom': g}
