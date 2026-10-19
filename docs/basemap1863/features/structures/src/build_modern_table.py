"""Build the table of modern structures to remove and the list of 1863 survivors to keep.

Outputs (docs/basemap1863/features/structures/):
  modern_structures_to_remove.json  rows (documented post-1863 structures), building class counts, rules, retain list
  modern_structures_to_remove.csv   the documented rows
  retain_1863_survivors.csv         surviving 1863 buildings (do NOT remove) with county srcid and the sibling inventory id
"""
import os, sys, json, csv, gzip, math, warnings, collections
warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
from shapely.geometry import shape, Point, Polygon, MultiPolygon
from shapely.ops import unary_union, transform as shp_transform
import build_structures as B
from sources import SRC
import modern_rows

OUT = B.OUTDIR
NAIP_BASE = 2013 + 154 / 365.0   # 2013-06-04
fc = json.load(open(os.path.join(OUT, 'structures.geojson'), encoding='utf-8'))
F = fc['features']
county = B.load_county()
T = B.T_UTM


def naip2013(r):
    b, rem = r['built'], r['removed']
    if b is not None and b > 2013:
        return 'no (built later)'
    if rem is not None and rem <= 2012:
        return 'no (removed %d)' % rem
    if rem == 2013:
        return 'no (removed March 2013)' if 'Cyclorama' in r['name'] else 'check (removed 2013)'
    if r['standing_2026'] is True:
        return 'yes'
    if b is not None and rem is None:
        return 'yes' if r['standing_2026'] else 'unknown (removal year not stated)'
    return 'unknown'


rows = []
for i, r in enumerate(modern_rows.ROWS):
    pos = r['pos']
    rows.append(dict(
        id='MODSTR-%03d' % (i + 1), name=r['name'], kind=r['kind'], built=r['built'], removed=r['removed'], standing_2026=r['standing_2026'],
        in_2013_naip=naip2013(r), where=r['where'], lon=pos[0] if pos else None, lat=pos[1] if pos else None, position_error_m=pos[2] if pos else None,
        position_basis=('OSM-mapped outline/point' if pos else 'description only (no coordinates in the sources read); use the modern inventory detections'),
        notes=r['notes'], sources=B.source_entries(r['src'])))

# ------------------------------------------------ retain list and building class counts
retain = []
used = set()
for f in F:
    p = f['properties']
    if p.get('adams_county_srcid') is not None:
        retain.append(dict(structure_id=p['id'], name=p['name'], status=p['status'], adams_county_srcid=p['adams_county_srcid'], geometry_represents=p.get('geometry_represents')))
        used.add(p['adams_county_srcid'])
# sibling inventory id
mod = {}
gz = os.path.abspath(os.path.join(OUT, '..', '..', 'modern', 'data', 'inventory_features.geojson.gz'))
if os.path.exists(gz):
    for ft in json.load(gzip.open(gz, 'rt', encoding='utf-8'))['features']:
        pr = ft['properties']
        if pr.get('src') == 'ADAMS' and pr.get('sub') == 'outline2023':
            mod[str(pr['srcid'])] = pr['id']
for r in retain:
    r['modern_inventory_id'] = mod.get(r['adams_county_srcid'])

# zones
mass = json.load(open(os.path.join(B.EVID, 'borough_mass.json'), encoding='utf-8'))
polys = [Polygon(m['ll']) for m in mass]
hull_ll = unary_union([p.buffer(0) for p in polys]).convex_hull
hull = shp_transform(lambda x, y, z=None: T.transform(x, y), hull_ll).buffer(40)
bounds = fc['properties']['bounds']
cnt = collections.Counter(); area = collections.Counter()
retained_cty = {str(county[i]['srcid']) for i in range(len(county)) if str(county[i]['srcid']) in used}
for i, c in county.items():
    cen = c['ll'].centroid
    if not (bounds['west'] <= cen.x <= bounds['east'] and bounds['south'] <= cen.y <= bounds['north']):
        continue
    a = c['utm'].area
    if c['srcid'] in retained_cty:
        z = 'retain: surviving 1863 structure (named in this catalogue)'
    elif hull.contains(c['utm'].centroid):
        z = 'borough zone: remove; replace by the 1863 borough building masses'
    elif a >= 1500:
        z = 'rural, large (>=1500 m2: commercial, institutional, industrial, farm-industrial): remove'
    elif a >= 100:
        z = 'rural, house-sized (100-1500 m2): remove unless it is a surviving 1863 farm building not yet catalogued'
    else:
        z = 'rural, small (<100 m2: sheds, garages, pool houses): remove'
    cnt[z] += 1; area[z] += a
classes = [dict(zone=k, count=v, footprint_m2=round(area[k])) for k, v in sorted(cnt.items())]

rules = [
    'Every 2023 building outline inside the bounds is a post-1863 structure to remove from the satellite base, EXCEPT the survivors in retain_1863_survivors.csv (and surviving 1863 buildings not yet catalogued: the 2018 NPS CLR counts over 40 farmstead properties that retain structures present in 1863, 28 of them are catalogued here).',
    'Inside the borough zone, remove every modern roof and draw the 1863 borough building masses (features of subtype borough_building_mass) instead; they are map-derived symbol extents, not footprints.',
    'A surviving 1863 building that was altered after the battle (status survives_altered) is kept, but its post-1863 additions must be removed; fabric_1863 and notes give what is known; the extent of additions is UNKNOWN for most.',
    'Where the removal of a structure uncovers ground, the ground is the neighbouring 1863 land cover; nothing is drawn that no source supports. Sites of lost 1863 buildings are drawn only where the catalogue gives a position and error.',
    'The structure rows below are documented by name, date and source; the per-feature detections (all 25,000 modern features, classes, counts) are in docs/basemap1863/modern/data/inventory_features.geojson.gz (sibling task).',
    'Monuments, markers and tablets are not buildings: the NPS counts about 1,830 monuments, markers, tablets and statues in the park (CLI Little Round Top) of which the OpenStreetMap extract holds %d monument/memorial/plaque points inside the bounds; all are post-1863 (the first stones were set in 1864-65) and are removed from the base; handled by the sibling inventory.',
]
osm = json.load(open(os.path.join(B.EVID, 'osm_poi_summary.json'), encoding='utf-8')) if os.path.exists(os.path.join(B.EVID, 'osm_poi_summary.json')) else {}
rules[-1] = rules[-1] % osm.get('monument_memorial_points', 0)

doc = dict(
    title='Modern (post-1863) structures to remove from the satellite base, and 1863 survivors to keep',
    label='Reconstruction support table; each row is sourced; positions are given only where a source supports them.',
    naip_base_flight='2013-06-04 (USDA NAIP, 1 m) per docs/basemap1863/modern/LICENCES.md',
    rules=rules, documented_structures=rows, county_building_classes=classes,
    county_buildings_in_bounds=int(sum(cnt.values())), retained_survivors=retain)
json.dump(doc, open(os.path.join(OUT, 'modern_structures_to_remove.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with open(os.path.join(OUT, 'modern_structures_to_remove.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['id', 'name', 'kind', 'built', 'removed', 'standing_2026', 'in_2013_naip', 'where', 'lon', 'lat', 'position_error_m', 'sources', 'notes'])
    for r in rows:
        w.writerow([r['id'], r['name'], r['kind'], r['built'], r['removed'], r['standing_2026'], r['in_2013_naip'], r['where'], r['lon'], r['lat'], r['position_error_m'],
                    ' | '.join('%s [%s] %s' % (s['src_key'], s['sheet_or_page'], s['url']) for s in r['sources']), r['notes']])
with open(os.path.join(OUT, 'retain_1863_survivors.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['structure_id', 'name', 'status', 'adams_county_srcid', 'modern_inventory_id', 'geometry_represents'])
    for r in retain:
        w.writerow([r['structure_id'], r['name'], r['status'], r['adams_county_srcid'], r['modern_inventory_id'], r['geometry_represents']])
print(len(rows), 'documented rows;', len(retain), 'survivors;', doc['county_buildings_in_bounds'], 'county outlines in bounds')
for c in classes:
    print(c)
