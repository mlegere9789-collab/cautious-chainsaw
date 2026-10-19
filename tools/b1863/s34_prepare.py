"""Stage 34: select what is drawn, from the catalogues in docs/basemap1863/features, and write tmp/b1863/build/draw_items.pkl (UTM geometries + style).

Drawing policy (every rule is recorded in docs/basemap1863/BUILD.md and counted in tmp/b1863/build/draw_stats.json):
  roads/lanes   drawn when present_1863 is true (confidence Documented or Estimated); not drawn when Unknown. Width by class from period descriptions (turnpike 6.5 m macadam,
                county road 5.5 m, township road 4.5 m, lane 3.0 m, town square as a street). Geometry is the catalogue geometry (modern centre line on the 1863 corridor).
  railways      RL-001 (in service 1858) as a ballasted single track; RL-002 (graded, no track, the Railroad Cuts) as an earth grade; post-1863 lines are not drawn.
  bridges       drawn where the catalogue says bridge (symbol on the sheet or class rule); fords and 'crossing (type unknown)' are not drawn.
  fences        only the 36 with draw=true (a continuous drawn line on the period sheet within the registration error); the other 356 are not drawn.
  structures    survivors: real roofs kept (stage 10). Curated polygons and points (position error <= 30 m) as schematic roofs with the documented footprint or typical dimensions.
                Machine-detected plate symbols (STR-MAPSYM) only when position error <= 35 m AND a building outline of the county's 2023 data lies within the error radius
                (independent evidence that a building site existed there). Borough masses (STR-BORO) as roof masses. Everything else is NOT drawn and listed as undrawn.
"""
import sys, os, json, re, pickle, csv, gzip, math, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from shapely.geometry import shape, Point, LineString, MultiLineString, Polygon
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

FEAT = C.FEAT
ROAD_W = {'turnpike': 6.5, 'county road': 5.5, 'township road': 4.5, 'lane (neighbourhood lane)': 3.0, 'lane or township road': 3.5, 'town square': 7.0}

def width_for(sub):
    for k, v in ROAD_W.items():
        if sub.startswith(k):
            return v
    return 4.0

def feet(s):
    m = re.search(r'(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*ft', s or '')
    if m:
        return float(m.group(1)) * 0.3048, float(m.group(2)) * 0.3048
    return None

DEFAULT_DIM = {'farmhouse': (11.0, 8.0), 'house': (9.0, 7.0), 'barn': (22.0, 13.0), 'bank_barn': (24.0, 13.0), 'building': (9.0, 6.0), 'outbuilding': (7.0, 5.0),
               'institutional': (24.0, 12.0), 'log_building': (6.0, 5.5), 'farmstead': (11.0, 8.0), 'stable': (12.0, 7.0), 'smokehouse': (4.0, 4.0), 'wagon_shed': (10.0, 6.0)}

def main():
    out = dict(roads=[], rails=[], bridges=[], fences=[], structures=[], masses=[], orchards=[])
    stats = dict(undrawn=[])
    # roads and lanes
    for fn in ('roads', 'lanes'):
        d = C.load_geojson(os.path.join(FEAT, 'roads-rail-water', fn + '.geojson'))
        for f in d['features']:
            p = f['properties']
            if p.get('present_1863') is not True or p.get('confidence') == 'Unknown' or not f['geometry']:
                stats['undrawn'].append(dict(id=p['id'], why='present_1863 not true or confidence Unknown'))
                continue
            g = C.geom_to_utm(f['geometry'])
            w = width_for(p['subtype'])
            out['roads'].append(dict(id=p['id'], geom=g, width=w, subtype=p['subtype'], conf=p['confidence'], err=p.get('positional_error_m'), name=p['name']))
    # railways
    d = C.load_geojson(os.path.join(FEAT, 'roads-rail-water', 'railways.geojson'))
    for f in d['features']:
        p = f['properties']
        if not f['geometry'] or f['geometry']['type'] == 'Point':
            continue
        if p.get('present_1863') is not True or p.get('confidence') == 'Unknown':
            stats['undrawn'].append(dict(id=p['id'], why='not present in 1863 or Unknown'))
            continue
        kind = 'track' if p['id'] == 'RL-001' else 'grade'
        out['rails'].append(dict(id=p['id'], geom=C.geom_to_utm(f['geometry']), kind=kind, conf=p['confidence'], err=p.get('positional_error_m')))
    # bridges
    d = C.load_geojson(os.path.join(FEAT, 'roads-rail-water', 'bridges.geojson'))
    rd = {r['id']: r for r in out['roads']}
    for f in d['features']:
        p = f['properties']
        if not p['subtype'].startswith('bridge'):
            stats['undrawn'].append(dict(id=p['id'], why='ford or crossing of unknown type'))
            continue
        g = C.geom_to_utm(f['geometry'])
        out['bridges'].append(dict(id=p['id'], pt=g, road=p.get('road_id'), conf=p['confidence'], err=p.get('positional_error_m'), name=p['name']))
    # fences
    d = C.load_geojson(os.path.join(FEAT, 'roads-rail-water', 'fences.geojson'))
    for f in d['features']:
        p = f['properties']
        if p.get('draw') is True and f['geometry']:
            out['fences'].append(dict(id=p['id'], geom=C.geom_to_utm(f['geometry']), stone='stone' in p['subtype'], conf=p['confidence'], err=p.get('positional_error_m')))
    # structures
    surv = {r['structure_id'] for r in csv.DictReader(open(os.path.join(FEAT, 'structures', 'retain_1863_survivors.csv'), encoding='utf-8'))}
    inv = C.load_geojson(os.path.join(FEAT, 'structures', 'structures.geojson'))
    # modern building outlines (for the MAPSYM corroboration)
    mod = [shape(f['geometry']) for f in json.load(gzip.open(os.path.join(C.MOD, 'data', 'inventory_features.geojson.gz'), 'rt', encoding='utf-8'))['features'] if f['properties']['cls'] == 'BUILDING' and f['geometry']['type'] == 'Polygon']
    modu = [transform(lambda x, y, z=None: C.ll2utm(x, y), g) for g in mod]
    tree = STRtree(modu)
    nmap = dict(total=0, drawn=0, no_corr=0, too_far=0)
    for f in inv['features']:
        p = f['properties']; i = p['id']
        g = f['geometry']
        if i in surv:
            continue
        if not g:
            stats['undrawn'].append(dict(id=i, why='no geometry (position UNKNOWN)'))
            continue
        gu = C.geom_to_utm(g)
        if i.startswith('STR-BORO'):
            out['masses'].append(dict(id=i, geom=gu, conf=p['confidence'], err=p.get('positional_error_m')))
            continue
        err = p.get('positional_error_m') or 0
        if i.startswith('STR-MAPSYM'):
            nmap['total'] += 1
            if err > 35:
                nmap['too_far'] += 1
                stats['undrawn'].append(dict(id=i, why='machine-detected symbol, position error > 35 m'))
                continue
            near = tree.query(gu.buffer(max(err, 15)))
            if len(near) == 0:
                nmap['no_corr'] += 1
                stats['undrawn'].append(dict(id=i, why='machine-detected symbol, no county building outline within the error radius (no corroboration)'))
                continue
            nmap['drawn'] += 1
            out['structures'].append(dict(id=i, geom=gu, sub='building', conf='Estimated', err=err, dims=None, material=None, roof=None, src='mapsym'))
            continue
        if err > 30:
            stats['undrawn'].append(dict(id=i, why='position error %s m > 30 m: drawn nowhere (existence documented, position not)' % err))
            continue
        if p['subtype'] in ('covered_bridge', 'mill'):
            stats['undrawn'].append(dict(id=i, why='site point, no footprint (the surviving bridge, if any, is in the photograph)'))
            continue
        out['structures'].append(dict(id=i, geom=gu, sub=p['subtype'], conf=p['confidence'], err=err, dims=feet(p.get('dims_documented')), material=p.get('material'), roof=p.get('roof'), src='curated', name=p['name'], status=p.get('status')))
    for f in C.load_geojson(os.path.join(FEAT, 'landcover', 'orchards_1863.geojson'))['features']:
        if f['geometry']:
            out['orchards'].append(dict(id=f['properties']['id'], geom=C.geom_to_utm(f['geometry']), conf=f['properties']['confidence']))
    # Hopkins 1858 borough: building symbols (core of the plan) replace the 1868-69 masses inside the plan; non-service streets of the plan are added to the roads
    hb = pickle.load(open(os.path.join(C.BUILD, 'hopkins_buildings.pkl'), 'rb'))
    hp = pickle.load(open(os.path.join(C.BUILD, 'hopkins_hull.pkl'), 'rb'))
    survpolys = unary_union([C.geom_to_utm(f['geometry']) for f in inv['features'] if f['properties']['id'] in surv and f['geometry'] and f['geometry']['type'] == 'Polygon']).buffer(3.0)
    dropped_surv = 0
    for k, g in enumerate(hb):
        if g.is_empty:
            continue
        if g.intersection(survpolys).area > 0.4 * g.area:
            dropped_surv += 1          # the real roof of a surviving 1863 building is kept in the photograph: not drawn twice
            continue
        out['structures'].append(dict(id='HOP-B-%04d' % (k + 1), geom=g, sub='building', conf='Estimated', err=4, dims=None, material=None, roof=None, src='hopkins'))
    before = len(out['masses'])
    out['masses'] = [m for m in out['masses'] if not m['geom'].intersects(hp.buffer(25))]
    stats['masses_superseded_by_hopkins'] = before - len(out['masses'])
    ts = pickle.load(open(os.path.join(C.BUILD, 'hopkins_town_streets.pkl'), 'rb'))
    for k, t in enumerate(ts):
        out['roads'].append(dict(id='HOP-S-%03d' % (k + 1), geom=t['geom'], width=6.5, subtype='town street (Hopkins 1858)', conf='Estimated', err=4, name=t['name']))
    stats['hopkins'] = dict(symbols_on_surviving_buildings_not_redrawn=dropped_surv, buildings=len(hb) - dropped_surv, streets=len(ts), masses_dropped=before - len(out['masses']))
    stats['mapsym'] = nmap
    stats['counts'] = {k: len(v) for k, v in out.items()}
    pickle.dump(out, open(os.path.join(C.BUILD, 'draw_items.pkl'), 'wb'))
    json.dump(stats, open(os.path.join(C.BUILD, 'draw_stats.json'), 'w'), indent=1)
    print(stats['counts'], nmap, 'undrawn', len(stats['undrawn']))

if __name__ == '__main__':
    main()
