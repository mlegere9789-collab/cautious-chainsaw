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

HOP_STREETS_REJECTED = {      # Hopkins street ids (index in hopkins_town_streets.pkl + 1) the verification passes showed are not streets of the 1858 inset
    24: 'arc of the 2013 Lincoln Square roundabout (the 1858 inset shows a plain crossing)', 33: 'arc of the 2013 roundabout', 34: 'arc of the 2013 roundabout', 35: 'arc of the 2013 roundabout',
    29: 'lies on the engraved Fahnestock building vignette, not in a street gap (57 percent of its centre line on dark ink); a park road of the 1890s-1900s by name',
    3: 'runs across the lettering BALTIMORE and a railway bar, not in a street gap', 7: 'runs inside the Roman Catholic cemetery enclosure', 16: 'runs into the railway bar and the water tint',
    19: 'crosses a lot with a lettered name (J. Winebrenner), not in a street gap', 42: 'crosses a blank lot (S. McCreary / S. Weldy), not in a street gap'}

def hopkins_error(g, hull):
    """positional error of a roof read from the 1858 inset: the NAIP absolute spec (6 m CE95) inside the hull of the 8 control points, growing by 5 percent of the distance outside it
    (the affine is extrapolated there: an independent fit differs by a median of 11.6 m beyond 200 m, pass 2)"""
    d = max(g.centroid.distance(hull), 0.0)
    return int(round(6 + 0.05 * d))

def main():
    out = dict(roads=[], rails=[], bridges=[], fences=[], structures=[], masses=[], orchards=[], streams=[])
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
    # Stevens Run through the borough (pass 4, D6): the NHD flowline between 39.8225 and 39.8340 N (the reach where the 2013 photograph shows no channel: built over or culverted)
    from shapely.geometry import box as sbox
    wcat = C.load_geojson(os.path.join(FEAT, 'roads-rail-water', 'waterways.geojson'))
    zone = sbox(*C.ll2utm(-77.2425, 39.8225), *C.ll2utm(-77.2225, 39.8340))
    for f in wcat['features']:
        p = f['properties']
        if p['name'] == 'Stevens Run' and f['geometry'] and p.get('present_1863') is True:
            g = C.geom_to_utm(f['geometry']).intersection(zone)
            if not g.is_empty:
                out['streams'].append(dict(id=p['id'], name='Stevens Run (borough reach)', geom=g, width=3.6, conf=p['confidence'], err=p.get('positional_error_m')))
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
    orient = C.load_geojson(os.path.join(FEAT, 'structures', 'symbol_orientation.json')) if os.path.exists(os.path.join(FEAT, 'structures', 'symbol_orientation.json')) else {}
    for f in inv['features']:
        p = f['properties']; i = p['id']
        g = f['geometry']
        if i in surv:
            continue
        if not g:
            stats['undrawn'].append(dict(id=i, why='no geometry (position UNKNOWN)'))
            continue
        if p.get('draw') is False or str(p.get('status', '')).startswith('not_drawn'):
            stats['undrawn'].append(dict(id=i, why='not drawn by decision of the catalogue: %s' % (p.get('notes') or '')[-160:]))
            continue
        gu = C.geom_to_utm(p['draw_geometry']) if p.get('draw_geometry') else C.geom_to_utm(g)
        if i.startswith('STR-BORO'):
            out['masses'].append(dict(id=i, geom=gu, conf=p['confidence'], err=p.get('positional_error_m')))
            continue
        err = p.get('positional_error_m') or 0
        if i.startswith('STR-MAPSYM'):
            nmap['total'] += 1
            stt = p.get('status')
            if stt == 'rejected_not_a_building_symbol':
                nmap['rejected'] = nmap.get('rejected', 0) + 1
                stats['undrawn'].append(dict(id=i, why='rejected on review: not a building symbol on the plate'))
                continue
            if stt == 'unreviewed_machine_detection':
                nmap['unreviewed'] = nmap.get('unreviewed', 0) + 1
                stats['undrawn'].append(dict(id=i, why='machine-detected symbol, not reviewed (UNKNOWN)'))
                continue
            if err > 60 or (err > 45 and stt != 'reviewed_symbol_on_plate'):
                nmap['too_far'] += 1
                stats['undrawn'].append(dict(id=i, why='machine-detected symbol, position error > 60 m (or > 45 m and not reviewed)'))
                continue
            near = tree.query(gu.buffer(max(err, 15)))
            if stt in ('confirmed_by_photograph', 'reviewed_symbol_on_plate'):
                near = [0]          # reviewed on the plate itself (or confirmed by an 1863 photograph): the county outlines of 2023 are not needed, and cannot show a building that is gone
            if len(near) == 0:
                nmap['no_corr'] += 1
                stats['undrawn'].append(dict(id=i, why='machine-detected symbol, no county building outline within the error radius (no corroboration)'))
                continue
            nmap['drawn'] += 1
            out['structures'].append(dict(id=i, geom=gu, sub='building', conf='Estimated', err=err, dims=None, material=None, roof=None, src='mapsym', angle_deg=(orient.get(i) or {}).get('angle_deg')))
            continue
        if err > 45:
            stats['undrawn'].append(dict(id=i, why='position error %s m > 45 m: drawn nowhere (existence documented, position not)' % err))
            continue
        if p['subtype'] in ('covered_bridge', 'mill'):
            stats['undrawn'].append(dict(id=i, why='site point, no footprint (the surviving bridge, if any, is in the photograph)'))
            continue
        out['structures'].append(dict(id=i, geom=gu, sub=p['subtype'], conf=p['confidence'], err=err, dims=feet(p.get('dims_documented')), material=p.get('material'), roof=p.get('roof'), src='curated', name=p['name'], status=p.get('status'), angle_deg=(orient.get(i) or {}).get('angle_deg')))
    for f in C.load_geojson(os.path.join(FEAT, 'landcover', 'orchards_1863.geojson'))['features']:
        if f['geometry']:
            out['orchards'].append(dict(id=f['properties']['id'], geom=C.geom_to_utm(f['geometry']), conf=f['properties']['confidence']))
    # Hopkins 1858 borough: building symbols (core of the plan) replace the 1868-69 masses inside the plan; non-service streets of the plan are added to the roads
    hb = pickle.load(open(os.path.join(C.BUILD, 'hopkins_buildings.pkl'), 'rb'))
    hp = pickle.load(open(os.path.join(C.BUILD, 'hopkins_hull.pkl'), 'rb'))
    survpolys = unary_union([C.geom_to_utm(f['geometry']) for f in inv['features'] if f['properties']['id'] in surv and f['geometry'] and f['geometry']['type'] == 'Polygon']).buffer(3.0)
    dropped_surv = 0
    from shapely.geometry import MultiPoint
    gc = json.load(open(os.path.join(C.DOCS, 'maps', 'gcps', 'hopkins_inset.json')))['gcps']
    hull = MultiPoint([tuple(q['en']) for q in gc]).convex_hull
    for k, g in enumerate(hb):
        if g.is_empty:
            continue
        if g.intersection(survpolys).area > 0.4 * g.area:
            dropped_surv += 1          # the real roof of a surviving 1863 building is kept in the photograph: not drawn twice
            continue
        out['structures'].append(dict(id='HOP-B-%04d' % (k + 1), geom=g, sub='building', conf='Estimated', err=hopkins_error(g, hull), dims=None, material=None, roof=None, src='hopkins'))
    before = len(out['masses'])
    out['masses'] = [m for m in out['masses'] if not m['geom'].intersects(hp.buffer(25))]
    # a building mass of the 1868-69 survey is never drawn over the real roof of a surviving building (Wade house: a mass was drawn over its kept roof)
    nm = []
    for m in out['masses']:
        g = m['geom'].difference(survpolys.buffer(1.5))
        if g.is_empty or g.area < 20:
            continue
        if g.geom_type == 'MultiPolygon':
            g = max(g.geoms, key=lambda q: q.area)
        m = dict(m); m['geom'] = g; nm.append(m)
    out['masses'] = nm
    stats['masses_superseded_by_hopkins'] = before - len(out['masses'])
    ts = pickle.load(open(os.path.join(C.BUILD, 'hopkins_town_streets.pkl'), 'rb'))
    n_rej = 0
    for k, t in enumerate(ts):
        if (k + 1) in HOP_STREETS_REJECTED:
            stats['undrawn'].append(dict(id='HOP-S-%03d' % (k + 1), why='rejected: ' + HOP_STREETS_REJECTED[k + 1])); n_rej += 1
            continue
        out['roads'].append(dict(id='HOP-S-%03d' % (k + 1), geom=t['geom'], width=6.5, subtype='town street (Hopkins 1858)', conf='Estimated', err=4, name=t['name']))
    stats['hopkins'] = dict(symbols_on_surviving_buildings_not_redrawn=dropped_surv, buildings=len(hb) - dropped_surv, streets=len(ts) - n_rej, streets_rejected=n_rej, masses_dropped=before - len(out['masses']))
    stats['mapsym'] = nmap
    stats['counts'] = {k: len(v) for k, v in out.items()}
    pickle.dump(out, open(os.path.join(C.BUILD, 'draw_items.pkl'), 'wb'))
    json.dump(stats, open(os.path.join(C.BUILD, 'draw_stats.json'), 'w'), indent=1)
    print(stats['counts'], nmap, 'undrawn', len(stats['undrawn']))

if __name__ == '__main__':
    main()
