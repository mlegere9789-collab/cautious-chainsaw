"""Corrections to the 1863 feature catalogues found by the eight verification passes (2026-10-19). Idempotent: run it as often as you like.

It edits docs/basemap1863/features/{structures,roads-rail-water}/*.geojson (and the Web Mercator copies) and the survivors list. Every edit records its reason in the feature's own
`notes` / `method` / `status` so the correction is visible in the catalogue and in the provenance layer. Run before stage 34.

  structures   - STR-MAPSYM: the 263 machine-detected plate symbols were viewed on the plate cw0353500 (tmp/b1863/fix/ms_*.png, rule in mapsym_review.json): 9 drawn ones are not building symbols
                 (lettering, marsh hatching, tree glyph, a fence line) and are rejected; the other 51 drawn ones are marked reviewed; the 203 undrawn ones are marked UNKNOWN (machine detection, not reviewed).
               - survivors whose Documented label rested on a plate symbol 29-84 m away are Estimated (identity of the surviving building is not tied to a plate symbol)
               - post-1863 fabric is no longer kept as a real roof: Spangler barn (1935), Presbyterian church (rebuilt), Penn Hall wings (1889; the 1837 main block is drawn instead)
               - Pennsylvania College is not drawn twice: the Warren mass 69 m from the surviving Penn Hall is the same building and is not drawn
               - added: Dobbin House (1776) and Sheads House (1862), both standing in 1863 and still standing; Trostle log hog pen and the Evergreen gatehouse pavilion (positions read from the
                 1863 photographs, pass 5); the four Leister outbuilding symbols are confirmed by the photograph LC 2025169709
  roads        - Harrisburg Road, Mummasburg Road and Granite Schoolhouse Lane are joined to the road network; the Diamond is a plain crossing (the 2013 roundabout is not drawn);
                 stated errors raised to the offsets measured by pass 2; sources typed A1/A2/B by what they are
  bridges      - errors and method text now say which bridges rest on a class rule only
"""
import sys, os, json, csv, math, copy, pickle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from shapely.geometry import shape, mapping, Point, LineString, MultiLineString, Polygon, box
from shapely.ops import transform, unary_union, linemerge
from shapely import affinity

F = C.FEAT
RR = os.path.join(F, 'roads-rail-water')
ST = os.path.join(F, 'structures')
from pyproj import Transformer
_wm = Transformer.from_crs('EPSG:4326', 'EPSG:3857', always_xy=True)

def to_merc(geom):
    return transform(lambda x, y, z=None: _wm.transform(x, y), geom)

def round_geom(gm, nd=6):
    def rc(c): return [round(c[0], nd), round(c[1], nd)]
    t = gm['type']
    if t == 'Point': gm['coordinates'] = rc(gm['coordinates'])
    elif t == 'LineString': gm['coordinates'] = [rc(c) for c in gm['coordinates']]
    elif t == 'MultiLineString': gm['coordinates'] = [[rc(c) for c in l] for l in gm['coordinates']]
    elif t == 'Polygon': gm['coordinates'] = [[[*rc(c)] for c in r] for r in gm['coordinates']]
    elif t == 'MultiPolygon': gm['coordinates'] = [[[rc(c) for c in r] for r in p] for p in gm['coordinates']]
    return gm

def write_pair(basepath, feats, name):
    """EPSG:4326 file and the Web Mercator copy (same layout as roads-rail-water/scripts/geomlib.py)"""
    fc = {'type': 'FeatureCollection', 'name': name, 'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'}}, 'features': feats}
    json.dump(fc, open(basepath + '.geojson', 'w', encoding='utf-8'), separators=(',', ':'))
    mf = []
    for f in feats:
        m = dict(f); m['geometry'] = round_geom(json.loads(json.dumps(mapping(to_merc(shape(f['geometry']))))), 1)
        mf.append(m)
    fc = {'type': 'FeatureCollection', 'name': name + '_epsg3857', 'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:EPSG::3857'}}, 'features': mf}
    json.dump(fc, open(basepath + '.mercator.geojson', 'w', encoding='utf-8'), separators=(',', ':'))

def ll(g):  return transform(lambda x, y, z=None: C.utm2ll(x, y), g)
def utm(g): return transform(lambda x, y, z=None: C.ll2utm(x, y), shape(g) if isinstance(g, dict) else g)
def load(p): return json.load(open(p, encoding='utf-8'))

S_WARREN = dict(cite='U.S. Army Office of the Chief of Engineers, Battle field of Gettysburg (Warren survey 1868-69, reduced to 1 inch = 1000 ft, no troop positions), scan cw0353500', sheet_or_page='whole plate', url='https://www.loc.gov/item/99448794/', type='A2', key='WARREN-PLATE')
S_BACH = dict(cite='Map of the battle field of Gettysburg (Bachelder 1876, topography from Warren 1868-69), sheet cw0325000a', sheet_or_page='First day sheet', url='https://www.loc.gov/item/99447491/', type='B', key='LOC-BACH-1876')
S_TREAT = dict(cite='Campbell, E., Treatment Philosophy: The 1863 Landscape, Gettysburg NMP (NPS, March 2004)', sheet_or_page='ch. 2 circulation, pdf p80 note 1', url='https://irma.nps.gov/DataStore/DownloadFile/472822', type='B', key='NPS-TREAT-2004')
S_PHOTO = lambda item, what: dict(cite='Library of Congress Prints and Photographs Division, photograph item %s (1863)' % item, sheet_or_page='item %s' % item, url='https://www.loc.gov/pictures/item/%s/' % item, type='A1', quote_or_paraphrase=what, key='LOC-PHOTO-%s' % item)

# ------------------------------------------------------------------------------------------------------------------------------------------------------- structures
def fix_structures():
    p = os.path.join(ST, 'structures.geojson')
    fc = load(p)
    feats = fc['features']
    by = {f['id']: f for f in feats}
    rev = load(os.path.join(ST, 'mapsym_review.json'))
    drawn_ids = set(rev['reviewed_drawn']); rej = rev['rejected']; confirmed_photo = rev.get('confirmed_by_photograph', {})
    n = dict(rejected=0, reviewed=0, unknown=0, photo=0)
    for f in feats:
        i = f['id']; q = f['properties']
        if not i.startswith('STR-MAPSYM-'):
            continue
        if i in rej:
            q.update(status='rejected_not_a_building_symbol', present_1863=False, confidence='Unknown',
                     period_note='No building symbol: %s' % rej[i])
            q['notes'] = (q.get('notes') or '').split(' | REVIEW:')[0] + ' | REVIEW: viewed on plate cw0353500 (2026-10-19): %s. Not a building symbol; not drawn.' % rej[i]
            n['rejected'] += 1
        elif i in confirmed_photo:
            q.update(status='confirmed_by_photograph', confidence='Estimated')
            q['notes'] = (q.get('notes') or '').split(' | REVIEW:')[0] + ' | REVIEW: ' + confirmed_photo[i]
            q['sources'] = [s for s in q['sources'] if 'LOC-PHOTO' not in s.get('key', '')] + [S_PHOTO('2025169709', 'Gardner/stereo view of General Meade headquarters (Leister house): low outbuildings and a fenced yard stand beside the house, where this plate symbol lies.')]
            n['photo'] += 1
        elif i in drawn_ids:
            q.update(status='reviewed_symbol_on_plate', confidence='Estimated')
            q['notes'] = (q.get('notes') or '').split(' | REVIEW:')[0] + ' | REVIEW: viewed on plate cw0353500 (2026-10-19): the point lies on a compact solid symbol (within 4 plate px). A symbol on the 1868-69 plate; standing in July 1863 is probable, not confirmed.'
            n['reviewed'] += 1
        else:
            q.update(status='unreviewed_machine_detection', confidence='Unknown')
            q['period_note'] = 'Machine detection on the 1868-69 plate, not reviewed: it may be lettering, hatching or a tree glyph. Not drawn.'
            n['unknown'] += 1
    # survivors whose Documented label rested on a distant plate symbol
    import re
    for f in feats:
        q = f['properties']
        m = re.search(r'symbol lies (\d+) m', q.get('method') or '')
        if m and int(m.group(1)) > 25 and q.get('confidence') == 'Documented':
            q['confidence'] = 'Estimated'
            q['notes'] = ((q.get('notes') or '') + ' The building is the surviving one (position of the 2023 outline, 4 m); that it is the 1863 building rests on the named sources, not on a plate symbol (the nearest lies %s m away). Estimated.' % m.group(1)).strip()
    # records that Documented but have no A1/A2 source in the catalogue: the label is Estimated
    for f in feats:
        q = f['properties']
        if q.get('confidence') == 'Documented' and not any(s.get('type') in ('A1', 'A2') for s in q.get('sources', [])):
            q['confidence'] = 'Estimated'
            q['notes'] = ((q.get('notes') or '') + ' Label lowered from Documented: no first-hand (A1/A2) source is cited for this record.').strip()
    # source types: Bachelder 1876 is a compilation (B); the Warren survey of 1868-69 is a later first-hand survey (A2)
    for f in feats:
        for s in f['properties'].get('sources', []):
            if s.get('key') in ('WARREN-BACH', 'LOC-BACH-1876') or 'Bachelder' in s.get('cite', '')[:60]:
                s['type'] = 'B'
            elif s.get('key') in ('WARREN-PLATE', 'LOC-WARREN-1869', 'WARREN-1869') or s.get('url', '').endswith('99448794/'):
                s['type'] = 'A2'
    # --- the Pennsylvania College mass is Penn Hall (69 m offset between the plate georeference and the surviving building)
    mass = by.get('STR-BORO-MASS-003')
    if mass:
        mass['properties'].update(status='not_drawn_duplicate_of_penn_hall')
        mass['properties']['notes'] = ((mass['properties'].get('notes') or '').split(' | FIX:')[0] + ' | FIX: this Warren building mass is Pennsylvania College (Penn Hall); the plate georeference puts it 69 m from the surviving building. Not drawn twice: Penn Hall is drawn at its true position (STR-TOWN-PENN_HALL).').strip()
    ph = by.get('STR-TOWN-PENN_HALL')
    if ph:
        g = utm(ph['geometry'])
        mrr = g.minimum_rotated_rectangle
        c = list(mrr.exterior.coords)
        e0 = Point(c[0]).distance(Point(c[1])); e1 = Point(c[1]).distance(Point(c[2]))
        ang = math.degrees(math.atan2(c[1][1] - c[0][1], c[1][0] - c[0][0])) if e0 >= e1 else math.degrees(math.atan2(c[2][1] - c[1][1], c[2][0] - c[1][0]))
        cen = g.centroid
        slab = affinity.rotate(box(cen.x - 18.0, cen.y - 60, cen.x + 18.0, cen.y + 60), 0, origin=cen)
        slab = affinity.rotate(slab, ang, origin=cen)
        main = g.intersection(slab)
        if main.geom_type != 'Polygon':
            main = max(main.geoms, key=lambda x: x.area)
        ph['properties']['draw_geometry'] = mapping(ll(main))
        ph['properties']['status'] = 'main_block_drawn_wings_1889_omitted'
        ph['properties']['notes'] = ((ph['properties'].get('notes') or '').split(' | FIX:')[0] + ' | FIX: the 2013 roof is NOT kept (the wings were added in 1889 and the roofing is modern). The 1837 main block is drawn as a schematic roof on the part of the 2023 footprint within 18 m of its centre along the long axis (%.0f m2 of %.0f m2); the width of the 1837 block is an estimate.' % (main.area, g.area)).strip()
    pres = by.get('STR-TOWN-PRESBYTERIAN_CHURCH')
    if pres:
        pres['properties']['draw'] = False
        pres['properties']['notes'] = ((pres['properties'].get('notes') or '').split(' | FIX:')[0] + ' | FIX: the present building was rebuilt after 1863 (Contested); its 2013 roof is not kept and its 1863 footprint is not known, so nothing is drawn from this record (the 1858 borough symbol, if any, is drawn instead).').strip()
    sb = by.get('STR-SPANGLER_H-BARN1')
    if sb:
        sb['properties']['notes'] = ((sb['properties'].get('notes') or '').split(' | FIX:')[0] + ' | FIX: the 1935 barn is not kept as a real roof; a schematic roof is drawn on the footprint of the later barn, which stands on the 1863 foundation (NPS).').strip()
    # --- new records
    new = []
    def mk(i, name, sub, geom, conf, err, method, notes, sources, **extra):
        q = dict(id=i, category='structure', subtype=sub, name=name, present_1863=True, period_note='', sources=sources, method=method, positional_error_m=err, confidence=conf, notes=notes,
                 farm=None, status='survives', geometry_kind='footprint_traced', georef_model=None, map_px_cw0325000a=None)
        q.update(extra)
        return dict(type='Feature', id=i, geometry=mapping(geom), properties=q)
    wp_dobbin = dict(cite='Wikipedia contributors, Dobbin House Tavern (read 2026-10-19)', sheet_or_page='article text', url='https://en.wikipedia.org/wiki/Dobbin_House_Tavern', type='B',
                     quote_or_paraphrase='Built 1776 as the home of the Rev. Alexander Dobbin at 89 Steinwehr Avenue; used as a field hospital during and after the battle.', key='WIKI-DOBBIN')
    wp_sheads = dict(cite='Wikipedia contributors, Sheads House (read 2026-10-19)', sheet_or_page='article text', url='https://en.wikipedia.org/wiki/Sheads_House', type='B',
                     quote_or_paraphrase='Built 1862 at 331 Buford Avenue, near 39.834 N 77.243 W; used as a hospital for wounded Confederate soldiers (the article does not date it).', key='WIKI-SHEADS')
    if 'STR-TOWN-DOBBIN_HOUSE' not in by:
        x0, y0 = C.X0 + 9678.0 - 0.5, C.Y0 - 6225.0 + 0.19
        rect = affinity.rotate(box(x0 - 6.25, y0 - 4.25, x0 + 6.25, y0 + 4.25), -31.5, origin=(x0, y0))
        new.append(mk('STR-TOWN-DOBBIN_HOUSE', 'Dobbin House (89 Steinwehr Avenue)', 'house', ll(rect), 'Estimated', 6,
                      'Roof outline traced by eye from the 2013 NAIP photograph (no county building outline exists for this roof): a 12.5 x 8.5 m rectangle rotated 31.5 degrees; the house is identified by its address and its position, 20 m from the Wikipedia point and 40 m from the National Register point.',
                      'Stone house, built 1776, standing in 1863 and still standing; the 2013 roof pixels are kept (survives_altered). Size and shape are those of the 2013 roof.', [wp_dobbin],
                      status='survives_altered', built='1776', geometry_represents='present roof outline traced from the 2013 photograph; 1863 form may differ'))
    if 'STR-TOWN-SHEADS_HOUSE' not in by:
        inv = {r['id']: r for r in pickle.load(open(os.path.join(C.TMPW, 'inventory_utm.pkl'), 'rb'))}
        g = inv['MOD-BUILDING-15775']['geom']
        new.append(mk('STR-TOWN-SHEADS_HOUSE', 'Sheads House (331 Buford Avenue)', 'house', ll(g), 'Estimated', 6,
                      'Footprint = 2023 outline MOD-BUILDING-15775 (the building 3 m from the Wikipedia point); identity from the address and the point.',
                      'Built 1862, standing in 1863 and still standing; the 2013 roof is kept (survives_altered).', [wp_sheads], status='survives_altered', built='1862',
                      geometry_represents='present building outline; 1863 form may have been smaller'))
    ph_photo = S_PHOTO('2018670894', 'O\'Sullivan view at Trostle\'s barn: a log hog pen stands against the east end of the barn.')
    if by.get('STR-TROSTLE-HOG_PEN1') and not by['STR-TROSTLE-HOG_PEN1']['geometry']:
        hp = by['STR-TROSTLE-HOG_PEN1']
        x, y = 308030.0, 4408190.0
        hp['geometry'] = mapping(ll(Point(x, y)))
        hp['properties'].update(positional_error_m=25, confidence='Estimated', geometry_kind='photo_pose_point',
                                method='Position projected from the pose of the camera of LC 2018670894 (fitted to the barn outline, tier B: pose 93 m SSW of the barn, hfov 30.7 degrees); the point is 20-30 m from the east end of the barn, as the NPS description says. Error 25 m (the barn itself projects 16 m off in the same fit).',
                        notes='Log hog pen against the east end of the barn (seen in the photograph). Point only; the drawn size is the class default.')
        hp['properties']['sources'] = hp['properties']['sources'] + [ph_photo]
    if 'STR-TOWN-GATEHOUSE_PAVILION' not in by:
        x, y = 309193.0, 4410244.0
        new.append(mk('STR-TOWN-GATEHOUSE_PAVILION', 'Pavilion beside the Evergreen Cemetery gatehouse', 'outbuilding', Point(*C.utm2ll(x, y)), 'Estimated', 15,
                      'Position projected from the pose of the camera of LC 2020634839 (Tyson, gatehouse seen from Baltimore Street, tier C): a small hip-roofed pavilion stands to the right of the gatehouse.',
                      'Small open pavilion; point only, the drawn size is a class default (5 x 4 m).', [S_PHOTO('2020634839', 'Evergreen Cemetery gatehouse with a small hip-roofed pavilion to its right.')], status='lost_later', dims_documented='16 x 13 ft', geometry_kind='photo_pose_point'))
    for nf in new:
        by[nf['id']] = nf
        feats.append(nf)
    json.dump(fc, open(p, 'w', encoding='utf-8'), separators=(',', ':'))
    mp = os.path.join(ST, 'structures.mercator.geojson')
    if os.path.exists(mp):
        mfc = copy.deepcopy(fc)
        mfc['features'] = []
        for f in feats:
            if not f['geometry']:
                mfc['features'].append(f); continue
            g = shape(f['geometry'])
            h = dict(f); h['geometry'] = round_geom(json.loads(json.dumps(mapping(to_merc(g)))), 1)
            mfc['features'].append(h)
        mfc['crs'] = {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:EPSG::3857'}}
        json.dump(mfc, open(mp, 'w', encoding='utf-8'), separators=(',', ':'))
    # survivors list
    sp = os.path.join(ST, 'retain_1863_survivors.csv')
    rows = list(csv.DictReader(open(sp, encoding='utf-8')))
    drop = {'STR-SPANGLER_H-BARN1', 'STR-TOWN-PRESBYTERIAN_CHURCH', 'STR-TOWN-PENN_HALL'}
    rows = [r for r in rows if r['structure_id'] not in drop]
    have = {r['structure_id'] for r in rows}
    for i, nm, rep in (('STR-TOWN-DOBBIN_HOUSE', 'Dobbin House', 'present roof outline traced from the 2013 photograph; 1863 form may differ'),
                       ('STR-TOWN-SHEADS_HOUSE', 'Sheads House', 'present building outline; 1863 form may have been smaller')):
        if i not in have:
            rows.append(dict(structure_id=i, name=nm, status='survives_altered', adams_county_srcid='', modern_inventory_id='', geometry_represents=rep))
    with open(sp, 'w', encoding='utf-8', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=['structure_id', 'name', 'status', 'adams_county_srcid', 'modern_inventory_id', 'geometry_represents'], lineterminator='\n')
        w.writeheader(); w.writerows(rows)
    print('structures:', n, 'new', [x['id'] for x in new], 'survivors', len(rows))

# ------------------------------------------------------------------------------------------------------------------------------------------------------- roads
def fix_roads():
    p = os.path.join(RR, 'roads.geojson')
    fc = load(p); feats = fc['features']
    by = {f['properties']['id']: f for f in feats}
    g8 = utm(by['RD-008']['geometry'])
    def parts(i):
        g = utm(by[i]['geometry'])
        return list(g.geoms) if g.geom_type == 'MultiLineString' else [g]
    src_w = dict(cite='Warren survey 1868-69 / Bachelder 1876: the road drawn between the loose ends (straight diagonal on the sheet), read 2026-10-19 on tmp/b1863/maps/georef/warren-1869.tif next to the drawn network', sheet_or_page='Gettysburg borough and north, cw0353500 / cw0325000a',
                 url='https://www.loc.gov/item/99448794/', type='A2', quote_or_paraphrase='The sheet draws the road as one straight diagonal running into the Carlisle Road at the north end of the borough (the apex of the V of the Harrisburg and Mummasburg roads).', key='WARREN-PLATE')
    # RD-007: extend from the south end straight (the sheet draws it straight, direction of the last drawn segment) to the Carlisle Road
    if 'Extended 2026-10-19' not in by['RD-007']['properties']['notes']:
        ps = parts('RD-007')
        pieces = [list(q.coords) for q in ps]
        south = min((c for pc in pieces for c in (pc[0], pc[-1])), key=lambda c: c[1])
        pc = next(pc for pc in pieces if south in (pc[0], pc[-1]))
        nxt = pc[1] if pc[0] == south else pc[-2]
        dx, dy = south[0] - nxt[0], south[1] - nxt[1]; L = math.hypot(dx, dy)
        far = (south[0] + dx / L * 900, south[1] + dy / L * 900)
        hit = LineString([south, far]).intersection(g8)
        pt = hit if hit.geom_type == 'Point' else min(hit.geoms, key=lambda h: h.distance(Point(south)))
        ext = LineString([south, (pt.x, pt.y)])
        merged = unary_union([q for q in ps] + [ext])
        mls = linemerge(merged)
        by['RD-007']['geometry'] = mapping(ll(mls))
        q = by['RD-007']['properties']
        q['notes'] = (q['notes'] + ' Extended 2026-10-19: the %.0f m between the south end of the TIGER centre line and the Carlisle Road (the modern streets there were removed with the borough network) is drawn straight in the direction of the last segment, as the Warren sheet draws it; the junction lies on the Carlisle Road.' % ext.length).strip()
        q['sources'] = q['sources'] + [src_w]; q['positional_error_m'] = max(q['positional_error_m'], 35)
        q['method'] = q['method'] + ' + straight extension of %.0f m to the Carlisle Road read on the Warren sheet.' % ext.length
    # RD-009: join the two pieces and the Carlisle Road
    if 'Joined 2026-10-19' not in by['RD-009']['properties']['notes']:
        ps = parts('RD-009')
        long_ = max(ps, key=lambda q: q.length); short = min(ps, key=lambda q: q.length)
        lc = list(long_.coords); sc = list(short.coords)
        # orient: long ends at the borough end (south)
        if lc[0][1] < lc[-1][1]: lc = lc[::-1]
        if sc[0][1] < sc[-1][1]: sc = sc[::-1]                  # short piece from north to south
        tail = sc
        end = tail[-1]; pre = tail[-2]
        dx, dy = end[0] - pre[0], end[1] - pre[1]; L = math.hypot(dx, dy)
        hit = LineString([end, (end[0] + dx / L * 500, end[1] + dy / L * 500)]).intersection(g8)
        pt = hit if hit.geom_type == 'Point' else min(hit.geoms, key=lambda h: h.distance(Point(end)))
        coords = lc + tail + [(pt.x, pt.y)]
        by['RD-009']['geometry'] = mapping(ll(LineString(coords)))
        q = by['RD-009']['properties']
        gap1 = Point(lc[-1]).distance(Point(tail[0]))
        q['notes'] = (q['notes'] + ' Joined 2026-10-19: the two TIGER pieces (%.0f m gap between them, the stretch past Pennsylvania College) are connected by a straight segment and the south end is carried to the Carlisle Road, as the Warren sheet draws the road (a straight diagonal; direction of both pieces agrees within 5 degrees).' % gap1).strip()
        q['sources'] = q['sources'] + [src_w]; q['positional_error_m'] = max(q['positional_error_m'], 35)
        q['method'] = q['method'] + ' + straight link of %.0f m and a 100 m end piece read on the Warren sheet.' % gap1
    # RD-016: continue along the OSM road (Granite Schoolhouse Lane, 283 m) to the Baltimore Pike
    if 'Continued 2026-10-19' not in by['RD-016']['properties']['notes']:
        inv = {r['id']: r for r in pickle.load(open(os.path.join(C.TMPW, 'inventory_utm.pkl'), 'rb'))}
        add = inv['MOD-ROAD_LOCAL-00703']['geom']
        base = parts('RD-016')[0]
        ends = list(base.coords)
        ac = list(add.coords)
        if Point(ac[0]).distance(Point(ends[-1])) > Point(ac[-1]).distance(Point(ends[-1])): ac = ac[::-1]
        coords = ends + ac
        by['RD-016']['geometry'] = mapping(ll(LineString(coords)))
        q = by['RD-016']['properties']
        q['notes'] = (q['notes'] + ' Continued 2026-10-19: the 283 m of the modern road of the same name (OpenStreetMap way MOD-ROAD_LOCAL-00703) that carries the lane to the Baltimore Pike (NPS lane inventory: the lane links the Taneytown Road with the Pike) is drawn; the junction lies on the Pike (and on RD-018, McAllister\'s Mill road).').strip()
        q['method'] = q['method'] + ' + 283 m of OpenStreetMap centre line to the Baltimore Pike.'
    # RD-024: the Diamond is a plain crossing; the 2013 roundabout is not drawn
    if 'roundabout removed' not in by['RD-024']['properties']['notes']:
        g = utm(by['RD-024']['geometry'])
        cx, cy = C.ll2utm(-77.23110, 39.83093)
        keep = [q for q in g.geoms if q.length > 40]            # the straight connecting edge, not the ring
        cross = [LineString([(cx - 14, cy), (cx + 14, cy)]), LineString([(cx, cy - 14), (cx, cy + 14)])]
        by['RD-024']['geometry'] = mapping(ll(MultiLineString([*keep, *cross])))
        q = by['RD-024']['properties']
        q['notes'] = 'The ring of the 2013 roundabout (Lincoln Square) is not drawn: roundabout removed 2026-10-19. The Hopkins 1858 inset and the Warren sheet show a plain crossing of the Baltimore-Carlisle and Chambersburg-York streets; two 28 m crossing lines join the radial roads at the Diamond.'
        q['method'] = 'Straight crossing lines at the centre of the Diamond and the straight TIGER connecting edge; the TIGER ring is dropped.'
    # stated errors: never below the offset measured by pass 2
    r2 = load(os.path.join(F, '..', 'verification', 'check2-results.json'))
    tbl = {r['catalogue_id']: r for r in r2['roads']['road_table'] if r['catalogue_id']}
    for i, r in tbl.items():
        q = by[i]['properties']
        mx = r.get('max_abs_offset_m')
        if mx is not None and q.get('positional_error_m') is not None and mx > q['positional_error_m']:
            q['notes'] = (q.get('notes') or '') + ' Stated error raised from %s to %d m: pass 2 measured a Warren-road offset of %.0f m.' % (q['positional_error_m'], math.ceil(mx), mx)
            q['positional_error_m'] = math.ceil(mx)
    # source types: Warren/Bachelder
    for f in feats:
        for s in f['properties'].get('sources', []):
            if 'Bachelder' in s.get('cite', '')[:60] or s.get('key') == 'LOC-BACH-1876':
                s['type'] = 'B'
            elif s.get('url', '').endswith('99448794/') or s.get('key') in ('WARREN-PLATE', 'LOC-WARREN-1869'):
                s['type'] = 'A2'
    for f in feats:
        q = f['properties']
        if q.get('confidence') == 'Documented' and not any(s.get('type') in ('A1', 'A2') for s in q.get('sources', [])):
            q['confidence'] = 'Estimated'
            q['notes'] = ((q.get('notes') or '') + ' Label lowered from Documented: no first-hand source is cited.').strip()
    # roads and lanes that the Warren sheet draws, that lie on a modern OpenStreetMap line of the same name or place, and that were neither drawn nor left in the photograph (pass 4, D4).
    # Each was checked by eye on the Warren raster next to the candidate line (tmp/b1863/fix/lv_*.png). The tree-lined lane (Fox Field Lane) and the diagonal road west of Cemetery Hill were NOT added:
    # on the sheet the first is a boundary double line with tree symbols, the second could not be matched to a single modern line.
    inv = {r['id']: r for r in pickle.load(open(os.path.join(C.TMPW, 'inventory_utm.pkl'), 'rb'))}
    NEW = [
        ('RD-030', 'North Stratton Street (road north from the Harrisburg/Mummasburg junction)', 'township road', 'MOD-ROAD_LOCAL-00477',
         'The Warren sheet draws a double-line road running north from the Carlisle Road at the north end of the borough (a straight N-S road beside the Harrisburg Road wedge); the modern street of the same alignment (OpenStreetMap way, North Stratton Street) is its centre line.', 35),
        ('RD-031', 'Slyder farm lane', 'lane (neighbourhood lane)', 'MOD-ROAD_SERVICE-00636',
         'The Warren sheet draws a double dashed lane running from the north-west to the J. Slyder farm buildings; the NPS lane of the same name (OpenStreetMap way Slyder Farm Lane, 411 m) follows it within the registration error.', 35),
        ('RD-032', 'Bushman farm lane', 'lane (neighbourhood lane)', 'MOD-TRACK-00014',
         'The Warren sheet draws a dashed double-line lane running east from the Emmitsburg Road to the M. Bushman farm; the NPS lane of the same name (OpenStreetMap way Bushman Farm Lane) lies on it within the registration error.', 35)]
    if 'RD-030' not in by:
        base_src = [dict(cite='U.S. Army Office of the Chief of Engineers, Battle field of Gettysburg (Warren survey 1868-69), scan cw0353500; the lane or road read on tmp/b1863/maps/georef/warren-1869.tif next to the candidate line, 2026-10-19',
                         sheet_or_page='see notes', url='https://www.loc.gov/item/99448794/', type='A2', quote_or_paraphrase='A road or lane drawn with double lines on the sheet, 1868-69 (the sheet is five years after the battle).', key='WARREN-PLATE'), S_TREAT]
        for i, nm, sub, mid, note, err in NEW:
            g = inv[mid]['geom']
            feats.append(dict(type='Feature', geometry=mapping(ll(g)), properties=dict(
                id=i, category='road', subtype=sub, name=nm, name_modern=inv[mid].get('name') or '', present_1863=True, period_note='present on the 1868-69 survey; standing in July 1863 is probable (farm lanes and the streets of the borough are older than the survey) but not independently confirmed',
                sources=base_src, method='Centre line of the modern OpenStreetMap way %s (%s), %.0f m, taken as the 1863 alignment; presence read on the Warren sheet.' % (mid, inv[mid].get('name') or 'unnamed', g.length),
                positional_error_m=err, confidence='Estimated', notes=note + ' Added 2026-10-19 after verification pass 4.', length_m_in_box=round(g.length))))
            by[i] = feats[-1]
    write_pair(os.path.join(RR, 'roads'), feats, 'roads_1863')
    print('roads written', len(feats))

def fix_bridges():
    p = os.path.join(RR, 'bridges.geojson')
    fc = load(p)
    for f in fc['features']:
        q = f['properties']
        sym = q.get('period_map_symbol')
        if q['id'] == 'BR-012': q['positional_error_m'] = 80; q['notes'] = (q.get('notes') or '') + ' Pass 1 measured the plate symbol about 75 m from the catalogue point: stated error raised to 80 m.'
        if q['id'] == 'BR-002': q['positional_error_m'] = 70; q['notes'] = (q.get('notes') or '') + ' Pass 1 measured the plate symbol about 65 m from the catalogue point: stated error raised to 70 m.'
        if q['id'] == 'BR-003': q['period_map_symbol'] = 'not seen'; q['confidence'] = 'Estimated'; q['notes'] = (q.get('notes') or '') + ' Pass 1 found no bar near the point on the plate: class rule only (turnpike over a named run).'
        if sym not in ('seen', 'probable') and q['subtype'].startswith('bridge'):
            q['class_rule_only'] = True
        for s in q.get('sources', []):
            if 'Bachelder' in s.get('cite', '')[:60]: s['type'] = 'B'
    json.dump(fc, open(p, 'w', encoding='utf-8'), separators=(',', ':'))
    mp = os.path.join(RR, 'bridges.mercator.geojson')
    mfc = load(mp); by = {f['properties']['id']: f['properties'] for f in fc['features']}
    for f in mfc['features']: f['properties'] = by[f['properties']['id']]
    json.dump(mfc, open(mp, 'w', encoding='utf-8'), separators=(',', ':'))
    print('bridges written')

def fix_other_types():
    for fn in ('lanes', 'railways', 'fences', 'waterways', 'water_features'):
        p = os.path.join(RR, fn + '.geojson')
        if not os.path.exists(p): continue
        fc = load(p); ch = False
        for f in fc['features']:
            q = f['properties']
            for s in q.get('sources', []):
                t = s.get('type')
                if 'Bachelder' in s.get('cite', '')[:60] and t != 'B': s['type'] = 'B'; ch = True
                elif s.get('url', '').endswith('99448794/') and t != 'A2': s['type'] = 'A2'; ch = True
            if q.get('confidence') == 'Documented' and q.get('sources') and not any(s.get('type') in ('A1', 'A2') for s in q['sources']):
                q['confidence'] = 'Estimated'; q['notes'] = ((q.get('notes') or '') + ' Label lowered from Documented: no first-hand (A1/A2) source is cited.').strip(); ch = True
        if ch:
            json.dump(fc, open(p, 'w', encoding='utf-8'), separators=(',', ':'))
            mp = os.path.join(RR, fn + '.mercator.geojson')
            if os.path.exists(mp):
                mfc = load(mp); by = {f['properties']['id']: f['properties'] for f in fc['features']}
                for f in mfc['features']: f['properties'] = by[f['properties']['id']]
                json.dump(mfc, open(mp, 'w', encoding='utf-8'), separators=(',', ':'))
            print(fn, 'retyped')
    # landcover types
    for fn in ('woods_1863', 'orchards_1863', 'scattered_trees_1863', 'fields_documented_1863', 'marsh_wetland_1863', 'boulder_fields_1863', 'open_cleared_1863'):
        p = os.path.join(F, 'landcover', fn + '.geojson')
        if not os.path.exists(p): continue
        fc = load(p); ch = False
        for f in fc['features']:
            q = f['properties']
            for s in q.get('sources', []):
                if 'Bachelder' in s.get('cite', '')[:60] and s.get('type') != 'B': s['type'] = 'B'; ch = True
                elif s.get('url', '').endswith('99448794/') and s.get('type') != 'A2': s['type'] = 'A2'; ch = True
        if ch:
            json.dump(fc, open(p, 'w', encoding='utf-8'), separators=(',', ':'))
            print(fn, 'retyped')

if __name__ == '__main__':
    fix_structures()
    fix_roads()
    fix_bridges()
    fix_other_types()
