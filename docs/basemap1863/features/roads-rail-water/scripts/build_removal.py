"""Classify every TIGER/Line 2023 road edge in the map box as present or absent in July 1863 and write the table of modern roads to remove.
Classes (rule order): 1863 road on the same line (spec_roads) -> duplicate route designation -> expressway/ramps (1963) -> NPS memorial avenues
(1882-1920) -> post-1863 street/drive/alley/driveway not in any 1863 source -> overrides (removal_overrides.json, written by the map checks)."""
import json, os, sys, csv, math
sys.path.insert(0, os.path.dirname(__file__))
from geomlib import *
from shapely.ops import transform as T
import spec_roads
from sources import SRC

NPS_AVENUE_BASES = {'Reynolds', 'Sykes', 'Doubleday', 'Confederate', 'Seminary Ridge', 'Meredith', 'Buford', 'Stone', 'Stone-Meredith', 'United States', 'Warren', 'Sickles', 'Wadsworth', 'Robinson',
    'Crawford', 'Hancock', 'Wright', 'Chamberlain', 'Sedgwick', 'Birney', 'Gregg', 'Berdan', 'Colgrove', 'Geary', 'Howard', 'Slocum', 'Pleasonton', 'Pleasanton', 'Ayres', 'Hunt', 'Jones',
    'Wainwright', 'Humphreys', 'Coster', 'Custer', 'Howe', 'Carman', 'Carmen', 'Cavalry', 'E Cavalry', 'S Confederate', 'W Confederate', 'E Confederate', 'SW Confederate', 'N Confederate'}
AVE_SRC = [SRC['NPS-CLI-LRT'], SRC['NPS-CLI-EMM']]
TOWN = box(-77.2380, 39.8240, -77.2240, 39.8345)   # approximate 1863 borough footprint (Bachelder town plan), lng/lat
def utm(g): return T(lambda x, y, z=None: ll2m(x, y), g)

def avenue_base(name):
    n = name or ''
    for suf in (' Ave N', ' Ave S', ' Ave', ' Dr', ' Rd'):
        if n.endswith(suf): return n[:-len(suf)]
    return None

def classify(overrides):
    # 1863 geometry in UTM for duplicate detection
    road_geoms = {}
    for r in spec_roads.ROADS:
        gs = [g for p, g in tiger_lines(ids=set(r['tiger']))]
        gm = merge_lines(gs, clip=XBOX)
        if gm is not None: road_geoms[r['id']] = utm(gm).buffer(4.0)
    spec_ids = {i: r['id'] for r in spec_roads.ROADS for i in r['tiger']}
    spec_present = {r['id']: r.get('present', True) for r in spec_roads.ROADS}
    rows = []
    for f in tiger():
        p = f['properties']; g = LineString(f['geometry']['coordinates'])
        gc = g.intersection(XBOX)
        if gc.is_empty: continue
        L = length_m(gc); lid = p['linearid']; nm = p['name'] or ''; mt = p['mtfcc']
        cen = gc.centroid
        row = dict(tiger_linearid=lid, name=nm, mtfcc=mt, length_m_in_box=round(L), centroid_lng=round(cen.x, 5), centroid_lat=round(cen.y, 5),
                   cls='', present_1863=None, feature_1863='', reason='', evidence='', action='')
        if lid in spec_ids and spec_present.get(spec_ids[lid], True) is None:
            row.update(cls='ROAD_1863_CANDIDATE', present_1863=None, feature_1863=spec_ids[lid], reason='Catalogued as a candidate 1863 road (existence not yet established by a source read); kept out of the removal list until decided.', evidence='spec_roads (no source)', action='undecided')
        elif lid in spec_ids:
            row.update(cls='ROAD_1863_SAME_LINE', present_1863=True, feature_1863=spec_ids[lid], reason='Centreline of this edge is the geometry of the catalogued 1863 road.', evidence='spec_roads',
                       action='surface removed, redrawn as the 1863 road')
        else:
            ug = utm(gc); dup = None
            for rid, bg in road_geoms.items():
                inter = ug.intersection(bg).length
                if ug.length > 0 and inter / ug.length > 0.9: dup = rid; break
            if dup:
                row.update(cls='DUPLICATE_ROUTE_DESIGNATION', present_1863=True, feature_1863=dup, reason='Same geometry as an edge of the catalogued 1863 road (TIGER repeats the edge under a route designation).', evidence='geometry overlap > 90% within 4 m',
                           action='same as the 1863 road')
            elif mt == 'S1100':
                row.update(cls='EXPRESSWAY_US15', present_1863=False, reason='US 15 Gettysburg bypass (freeway) opened 28 June 1963.', evidence='AARoads wiki: U.S. Route 15 in Pennsylvania (Gettysburg bypass opened June 28, 1963)',
                           action='remove (pavement, embankments, interchanges: handled with the terrain layer)')
            elif mt in ('S1630', 'S1640'):
                row.update(cls='RAMP_OR_TURN_LANE', present_1863=False, reason='Interchange ramp or turn lane of the modern highway system.', evidence='TIGER MTFCC ' + mt, action='remove')
            else:
                base = avenue_base(nm)
                if base and base in NPS_AVENUE_BASES and mt == 'S1400':
                    row.update(cls='NPS_MEMORIAL_AVENUE', present_1863=False, reason='Named memorial avenue of the park system, developed 1882-1920 (GBMA and Gettysburg National Park Commission); where an avenue follows an older farm lane or road that lane is catalogued separately.',
                               evidence='NPS CLI Little Round Top pdf p64-65; CLI Emmitsburg Road Ridge pdf p89-92 (Hancock 1882, Sickles 1887/1895-97, United States 1895); CLI Pickett\'s Charge pdf p88-90 (West Confederate 1894-1901, Birney 1910); CLI First Day pdf p62 (Buford 1889)', action='remove (Telford surface, gutters, avenue fences)')
                elif mt == 'S1740':
                    row.update(cls='PRIVATE_DRIVE', present_1863=False, reason='Private road or driveway (TIGER S1740); no 1863 source places a road on this line.', evidence='TIGER MTFCC S1740', action='remove')
                elif mt == 'S1780':
                    row.update(cls='PARKING_LOT_ROAD', present_1863=False, reason='Parking lot road (TIGER S1780).', evidence='TIGER MTFCC S1780', action='remove')
                elif mt == 'S1730':
                    row.update(cls='ALLEY', present_1863=None, reason='Alley (TIGER S1730); 1863 existence to be read from the town plan.', evidence='', action='undecided')
                elif mt == 'S1710':
                    row.update(cls='WALKING_PATH', present_1863=False, reason='Walking path (TIGER S1710).', evidence='TIGER MTFCC S1710', action='remove')
                elif TOWN.contains(cen):
                    row.update(cls='TOWN_STREET_UNDECIDED', present_1863=None, reason='Street or alley inside the 1863 borough footprint; whether this line is a street on the 1863 town plan is decided by the town-plan check (removal_overrides.json).',
                               evidence='', action='undecided')
                elif (nm.endswith(' Rd') or nm.endswith(' Rd Exd') or nm.endswith(' Road')) and L >= 700:
                    row.update(cls='RURAL_ROAD_UNDECIDED', present_1863=None, reason='Long rural road; many county roads of 1863 survive, but no 1863 source read here confirms this one; to be decided on a period map that covers it.',
                               evidence='', action='undecided')
                else:
                    row.update(cls='POST_1863_STREET_OR_DRIVE', present_1863=False, reason='Short street, court, circle, lane or drive of the modern road pattern (suburban subdivisions of the 1950s and later around the borough, parking and park service roads); no 1863 source read places a road here.',
                               evidence='NPS CLI First Day pdf p23 (suburban development on historically open farmland, mostly since the 1950s)', action='remove unless overridden')
        o = overrides.get(lid)
        if o: row.update(o)
        rows.append(row)
    return rows

if __name__ == '__main__':
    op = os.path.join(OUT, 'removal_overrides.json')
    ov = json.load(open(op)) if os.path.exists(op) else {}
    rows = classify(ov)
    rows.sort(key=lambda r: (r['cls'], r['name'], r['tiger_linearid']))
    json.dump(rows, open(os.path.join(OUT, 'modern-roads-remove.json'), 'w'), indent=1)
    with open(os.path.join(OUT, 'modern-roads-remove.csv'), 'w', newline='', encoding='utf8') as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    import collections
    c = collections.Counter(r['cls'] for r in rows); lk = collections.defaultdict(float)
    for r in rows: lk[r['cls']] += r['length_m_in_box'] / 1000
    for k, v in c.most_common(): print(k, v, round(lk[k], 1), 'km')
