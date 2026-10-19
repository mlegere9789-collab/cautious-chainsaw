"""Build the modern-feature inventory (vectors) from every source in tmp/b1863/modern/vec and write
  docs/basemap1863/modern/data/inventory_features.geojson.gz   (all records, WGS84, with id/class/source)
  docs/basemap1863/modern/results/inventory.json               (per-class counts, lengths, areas, sources)
  tmp/b1863/modern/work/inventory_utm.pkl                      (records in UTM for the mask builder)
Run:  PYTHONUTF8=1 python build_inventory.py
"""
import gzip, json, os, pickle, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from classify import *
from shapely.strtree import STRtree
from shapely.geometry import Point

OUT = os.path.join(ROOT, 'docs', 'basemap1863', 'modern')
WORK = os.path.join(ROOT, 'tmp', 'b1863', 'modern', 'work')
os.makedirs(os.path.join(OUT, 'data'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'results'), exist_ok=True)
os.makedirs(WORK, exist_ok=True)

recs = []
for fn in ['memorials', 'towers_power', 'highways', 'barriers', 'buildings', 'landuse']:
    recs += osm_records(f'osm_{fn}.json', fn)
# OSM elements come back from several overlapping queries: keep one record per OSM id
seen, uniq = set(), []
for r in recs:
    if r['srcid'] in seen:
        continue
    seen.add(r['srcid'])
    uniq.append(r)
recs = uniq
classify_all(recs)
n_osm = len(recs)

# ---------- Adams County buildings (primary building source) ----------
adams_b = geojson_records('adams_buildings2023.json', 'ADAMS')
for r in adams_b:
    r['cls'], r['sub'] = 'BUILDING', 'outline2023'
    r['tags'] = {k: v for k, v in r['tags'].items() if k in ('Parcel_ID', 'PROPERTY_T', 'DISTRICT_1')}
# OSM buildings (polygons) not already covered by an Adams outline are added (e.g. razed since 2023 or mapped differently)
tree = STRtree([r['geom'] for r in adams_b])
extra_b = 0
keep = []
for r in recs:
    if r['cls'] == 'BUILDING' and r['geom'].geom_type in ('Polygon', 'MultiPolygon'):
        hit = tree.query(r['geom'], predicate='intersects')
        ov = sum(adams_b[i]['geom'].intersection(r['geom']).area for i in hit)
        if r['geom'].area > 0 and ov / r['geom'].area >= 0.4:
            # attach the OSM name/type to the Adams outline with the largest overlap (attribute join, no duplicate record)
            if hit.size:
                best = max(hit, key=lambda i: adams_b[i]['geom'].intersection(r['geom']).area)
                adams_b[best]['osm'] = dict(id=r['srcid'], name=r['name'], type=r['sub'])
            continue
        extra_b += 1
    keep.append(r)
recs = keep + adams_b

# ---------- roads: add Adams / TIGER segments the OSM net does not cover ----------
road_cls = ('ROAD_ARTERIAL', 'ROAD_LOCAL', 'ROAD_SERVICE', 'PATH', 'TRACK')
osm_roads = [r for r in recs if r['cls'] in road_cls and r['src'] == 'OSM']
rtree = STRtree([r['geom'] for r in osm_roads])
rd_stats = {}


def covered_frac(g, tol=15.0):
    hit = rtree.query(g.buffer(tol), predicate='intersects')
    if hit.size == 0:
        return 0.0
    cov = g.intersection(unary_union([osm_roads[i]['geom'].buffer(tol) for i in hit]))
    return cov.length / g.length if g.length else 1.0


TIGER_CLS = {'S1100': 'ROAD_ARTERIAL', 'S1200': 'ROAD_ARTERIAL', 'S1400': 'ROAD_LOCAL', 'S1630': 'ROAD_ARTERIAL', 'S1640': 'ROAD_SERVICE', 'S1730': 'ROAD_SERVICE',
             'S1740': 'ROAD_SERVICE', 'S1780': 'ROAD_SERVICE', 'S1710': 'PATH', 'S1820': 'PATH', 'S1830': 'PATH', 'S1500': 'TRACK'}
ADAMS_CLS = {'US Highway': 'ROAD_ARTERIAL', 'State': 'ROAD_ARTERIAL', 'Township': 'ROAD_LOCAL', 'Borough': 'ROAD_LOCAL', 'GNMP': 'ROAD_LOCAL', 'Private': 'ROAD_SERVICE', 'Alley': 'ROAD_SERVICE', 'Undetermined': 'ROAD_LOCAL'}
added = collections.Counter()
checks = {}
for name, src, cmap, key in [('adams_centerline.json', 'ADAMS', ADAMS_CLS, 'RoadClass')] + \
        [(f'tiger_{n}.json', 'TIGER', TIGER_CLS, 'MTFCC') for n in ('local', 'primary', 'sec_hwy', 'sec_72k')]:
    rows = geojson_records(name, src)
    tot = cov = 0.0
    for r in rows:
        if r['geom'].geom_type not in ('LineString', 'MultiLineString'):
            continue
        f = covered_frac(r['geom'])
        tot += r['geom'].length
        cov += r['geom'].length * f
        if f < 0.5:
            r['cls'] = cmap.get(r['tags'].get(key), 'ROAD_LOCAL')
            r['sub'] = str(r['tags'].get(key))
            r['name'] = r['tags'].get('NAME') or r['tags'].get('Abr_Anno')
            r['tags'] = {k: v for k, v in r['tags'].items() if k in ('NAME', 'MTFCC', 'RoadClass', 'Abr_Anno', 'Class')}
            recs.append(r)
            added[(src, r['cls'])] += 1
    checks[name] = dict(segments=len(rows), length_km=round(tot / 1000, 2), osm_covered_fraction=round(cov / tot, 3) if tot else None)

# TIGER rail
for r in geojson_records('tiger_rail.json', 'TIGER'):
    r['cls'], r['sub'] = 'RAIL', 'R1011'
    r['name'] = r['tags'].get('NAME')
    r['tags'] = {'NAME': r['name']}
    recs.append(r)

# ---------- water: NHD records are added only where no OSM water polygon covers them (the two overlap heavily) ----------
osm_w = [r for r in recs if r['cls'] in ('WATER_POND', 'WATER_MODERN') and r['src'] == 'OSM' and r['geom'].geom_type in ('Polygon', 'MultiPolygon')]
wtree = STRtree([r['geom'] for r in osm_w])
nhd_dup = nhd_add = 0
for r in geojson_records('nhd_waterbody.json', 'NHD'):
    g = r['geom']
    hit = wtree.query(g, predicate='intersects')
    cov = sum(osm_w[i]['geom'].intersection(g).area for i in hit) / g.area if g.area else 1
    if cov >= 0.5:
        nhd_dup += 1
        continue
    nhd_add += 1
    fc = r['tags'].get('FCODE'); ft = r['tags'].get('FTYPE')
    r['cls'] = 'WATER_MODERN' if ft == 436 else 'WATER_POND'
    r['sub'] = f'FCODE {fc}'
    r['tags'] = {k: r['tags'].get(k) for k in ('PERMANENT_IDENTIFIER', 'FTYPE', 'FCODE', 'AREASQKM', 'GNIS_NAME')}
    recs.append(r)
# named / sized impoundments: a lake of 5 ha or more and a pond named for a quarry are engineered water
EVIDENCE = {}
for r in recs:
    if r['cls'] == 'WATER_POND' and r['geom'].geom_type in ('Polygon', 'MultiPolygon'):
        if r['geom'].area >= 5e4:
            r['cls'] = 'WATER_MODERN'; r['sub'] = 'large lake (>= 5 ha)'
            if r.get('name') == 'Lake Heritage':
                EVIDENCE[r['srcid']] = dict(feature='Lake Heritage', claim='impounded by a dam completed in 1966; the community was founded in 1965; the lake did not exist in 1863', confidence='Documented (secondary)',
                                            sources=['https://en.wikipedia.org/wiki/Lake_Heritage,_Pennsylvania (B, describes a 154-acre artificial lake)', 'https://recallcheck.net/dam-safety/58120 (B, republishes the National Inventory of Dams: year completed 1966)', 'https://snoflo.org/reservoir/pennsylvania/pa00334-lake-heritage (B, dam report: 1966)', 'https://lakeheritage.org/ (B, community founded 1965)'],
                                            note='no 1860s map was checked here for the valley (the maps layer owns that check); the dam record is the evidence')
        elif 'quarry' in (r.get('name') or '').lower():
            r['cls'] = 'WATER_MODERN'; r['sub'] = 'quarry pond'
json.dump(EVIDENCE, open(os.path.join(OUT, 'data', 'evidence_cases.json'), 'w', encoding='utf8'), indent=1)

# ---------- monuments: OSM points plus the Wikipedia list (CC BY-SA 4.0) where the OSM net has no point within 15 m ----------
mons = [r for r in recs if r['cls'] == 'MONUMENT']
mpts = [r['geom'].centroid for r in mons]
mtree = STRtree(mpts)
wiki = json.load(open(os.path.join(os.environ.get('B1863_VEC', os.path.join(ROOT, 'tmp', 'b1863', 'modern', 'vec')), 'wiki_monuments.json'), encoding='utf8'))
w_added = w_dup = 0
w_offsets = []
for w in wiki:
    p = to_utm(Point(w['lon'], w['lat']))
    hit = mtree.query(p.buffer(15))
    if hit.size:
        w_dup += 1
        w_offsets.append(min(p.distance(mpts[i]) for i in hit))
        continue
    w_added += 1
    recs.append(dict(src='WIKI', srcid=f"MN{w['mn']}" if w['mn'] else None, tags=dict(year=w['year']), name=w['name'], geom=p, cls='MONUMENT', sub='listed (Wikipedia list)'))

# ---------- clip everything to the box (so lengths and areas are the box's, not whole segments') ----------
from shapely.geometry import box as _box
_b = to_utm(_box(-77.34375, 39.75788, -77.14600, 39.87602))
_bb = _box(*_b.bounds)   # UTM axis-aligned hull of the box, the same extent the rasters use
clipped = []
for r in recs:
    g = r['geom'].intersection(_bb)
    if g.is_empty:
        continue
    r['geom'] = g
    clipped.append(r)
recs = clipped

# ---------- ids and statistics ----------
PFX = {c: c.replace('_', '')[:5] for c in CLASSES}
cnt = collections.Counter()
for r in recs:
    if 'cls' not in r:
        r['cls'], r['sub'] = 'OTHER', ''
    cnt[r['cls']] += 1
    r['id'] = f"MOD-{r['cls']}-{cnt[r['cls']]:05d}"

stats = {}
for c, (label, kind, removal, note) in CLASSES.items():
    rs = [r for r in recs if r['cls'] == c]
    st = dict(label=label, removal=removal, note=note, count=len(rs), sources=dict(collections.Counter(r['src'] for r in rs)))
    L = sum(r['geom'].length for r in rs if r['geom'].geom_type in ('LineString', 'MultiLineString'))
    A = sum(r['geom'].area for r in rs if r['geom'].geom_type in ('Polygon', 'MultiPolygon'))
    if L:
        st['length_km'] = round(L / 1000, 2)
    if A:
        st['area_ha'] = round(A / 1e4, 2)
    st['geometry_types'] = dict(collections.Counter(r['geom'].geom_type for r in rs))
    st['subclasses'] = dict(collections.Counter(r['sub'] for r in rs).most_common(12))
    stats[c] = st

summary = dict(
    box_wgs84=[-77.34375, 39.75788, -77.14600, 39.87602],
    osm_elements_unique=n_osm, adams_building_outlines=len(adams_b), osm_buildings_added_not_in_adams=extra_b, nhd_water_duplicates_of_osm=nhd_dup, nhd_water_added=nhd_add,
    road_cross_check=checks, road_segments_added_from_adams_tiger={f'{a}:{b}': v for (a, b), v in added.items()},
    monuments=dict(osm_points=len(mons), wikipedia_list_entries_with_coords=len(wiki), wikipedia_matched_to_osm_within_15m=w_dup, wikipedia_added=w_added,
                   wiki_osm_offset_median_m=round(sorted(w_offsets)[len(w_offsets) // 2], 1) if w_offsets else None,
                   wiki_osm_offset_p90_m=round(sorted(w_offsets)[int(len(w_offsets) * .9)], 1) if w_offsets else None,
                   total_listed=len([r for r in recs if r['cls'] == 'MONUMENT']),
                   nps_published_count_note='NPS-managed unit: 1,320 monuments and markers as of 2008 (cited by the Wikipedia list to its ref 2); the NPS Civil War Soldiers and Sailors page says almost 1,400. The NPS does not publish their coordinates as open data (searched: data.gov, NPS Data Store, NPS ArcGIS org). Positions here come from OSM (ODbL) and the Wikipedia list (CC BY-SA 4.0).'),
    classes=stats)
json.dump(summary, open(os.path.join(OUT, 'results', 'inventory.json'), 'w', encoding='utf8'), indent=1)

# compact GeoJSON (WGS84, 6 decimals ~ 0.1 m)
feats = []
for r in recs:
    g = to_ll(r['geom'])
    props = dict(id=r['id'], cls=r['cls'], sub=r['sub'], src=r['src'], srcid=r['srcid'])
    if r.get('name'):
        props['name'] = r['name']
    if r.get('osm'):
        props['osm'] = r['osm']
    feats.append(dict(type='Feature', properties=props, geometry=json.loads(json.dumps(mapping(g), separators=(',', ':')))))


def rnd(o):
    if isinstance(o, float):
        return round(o, 6)
    if isinstance(o, (list, tuple)):
        return [rnd(x) for x in o]
    return o


for f in feats:
    f['geometry']['coordinates'] = rnd(f['geometry']['coordinates'])
with gzip.open(os.path.join(OUT, 'data', 'inventory_features.geojson.gz'), 'wt', encoding='utf8', compresslevel=9) as z:
    json.dump(dict(type='FeatureCollection', features=feats), z, separators=(',', ':'))
pickle.dump(recs, open(os.path.join(WORK, 'inventory_utm.pkl'), 'wb'))
print(json.dumps({c: (s['count'], s.get('length_km'), s.get('area_ha')) for c, s in stats.items()}, indent=0))
print(json.dumps({k: v for k, v in summary.items() if k != 'classes'}, indent=1))
