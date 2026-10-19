"""Load every vector source of the modern-feature inventory into one list of records in UTM 18N (EPSG:26918).

Sources (all read-only, cached by fetch_*.py under tmp/b1863/modern/vec/):
  OSM  : OpenStreetMap contributors, ODbL 1.0 (Overpass API extracts; attribution kept in LICENCES.md)
  ADAMS: Adams County (PA) GIS Building Outlines 2023 and GIS Centerline (county public records)
  TIGER: US Census Bureau TIGERweb Transportation (public domain)
  NHD  : USGS National Hydrography Dataset, large scale (public domain)
  USGS : USGS The National Map structures (public domain)

A record is a dict: id, cls, sub, src, srcid, name, geom (shapely, UTM18N), attrs (small dict).
The class assignment is rule based on the source tags (RULES below) and is reproducible; nothing is guessed.
"""
import json, os, sys
from shapely.geometry import shape, Point, LineString, Polygon, MultiPolygon, mapping
from shapely.ops import transform as shp_transform, unary_union
from shapely import make_valid
from pyproj import Transformer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
VEC = os.environ.get('B1863_VEC', os.path.join(ROOT, 'tmp', 'b1863', 'modern', 'vec'))
_T = Transformer.from_crs(4326, 26918, always_xy=True)
_Ti = Transformer.from_crs(26918, 4326, always_xy=True)


def to_utm(g):
    return shp_transform(lambda x, y, z=None: _T.transform(x, y), g)


def to_ll(g):
    return shp_transform(lambda x, y, z=None: _Ti.transform(x, y), g)


def _rd(p):
    with open(os.path.join(VEC, p), encoding='utf8') as f:
        return json.load(f)


def osm_geom(e):
    """GeoJSON-like shapely geometry in lon/lat from an Overpass element (out geom / out center)."""
    t = e['type']
    if t == 'node':
        return Point(e['lon'], e['lat'])
    if t == 'way':
        pts = [(p['lon'], p['lat']) for p in e.get('geometry', [])]
        if not pts:
            c = e.get('center')
            return Point(c['lon'], c['lat']) if c else None
        closed = len(pts) >= 4 and pts[0] == pts[-1]
        tags = e.get('tags', {})
        area_like = closed and not (tags.get('highway') or tags.get('barrier') or tags.get('waterway') or tags.get('power') in ('line', 'minor_line') or tags.get('railway'))
        if tags.get('area') == 'yes' or tags.get('amenity') == 'parking' or tags.get('building'):
            area_like = closed
        if area_like:
            return Polygon(pts)
        return LineString(pts) if len(pts) >= 2 else Point(pts[0])
    if t == 'relation':
        rings = []
        for m in e.get('members', []):
            if m.get('role') == 'outer' and m.get('geometry'):
                pts = [(p['lon'], p['lat']) for p in m['geometry']]
                if len(pts) >= 4:
                    rings.append(Polygon(pts))
        if not rings:
            return None
        return unary_union([make_valid(r) for r in rings])
    return None


def osm_records(fname, prefix):
    out = []
    for e in _rd(fname)['elements']:
        g = osm_geom(e)
        if g is None or g.is_empty:
            continue
        out.append(dict(src='OSM', srcid=f"{e['type'][0]}{e['id']}", tags=e.get('tags', {}), name=e.get('tags', {}).get('name'), geom=to_utm(make_valid(g)), file=prefix))
    return out


def geojson_records(fname, src, idfield='OBJECTID'):
    out = []
    for f in _rd(fname)['features']:
        if not f.get('geometry'):
            continue
        g = shape(f['geometry'])
        if g.is_empty:
            continue
        out.append(dict(src=src, srcid=str(f['properties'].get(idfield)), tags=f['properties'], name=None, geom=to_utm(make_valid(g)), file=fname))
    return out


if __name__ == '__main__':
    for fn in sorted(os.listdir(VEC)):
        print(fn, os.path.getsize(os.path.join(VEC, fn)))
