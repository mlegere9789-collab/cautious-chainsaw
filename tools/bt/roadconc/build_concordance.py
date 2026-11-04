"""Builds docs/battle-theatre/app/data/road-concordance.json and docs/battle-theatre/library/ROAD-CONCORDANCE.md (2026-10-22, DEC-014).

The concordance says, for each period road NAME that a position-ledger claim prints and the repository's gazetteer does not hold under that name, what the period sources say it is.
Everything authored here was read by hand from the sources named in each entry; the computed parts are (a) every quotation, re-verified against the OR text with tools/bt/or27_find.py --verify
(a quotation that is not found stops the build), (b) the crossing of each resolved road with the edge of the loaded ground, from data/gazetteer.json, (c) the leaf-unit counts, from history/units.json,
(d) the SHA-256 of every scan read. Nothing in it is a coordinate of a unit; no road is aliased to another by guess: a name that the sources do not settle stays `unresolved` with the reason.

Tiers (the PDF's): documented = a period map prints the name on the road, or an OR report equates the two names; inferred = two or more period sources of different kind (OR text, period maps) agree on the identity
and none contradicts it (the argument is written out and the alternatives that were rejected are listed); unresolved = neither.
    python tools/bt/roadconc/build_concordance.py            (writes both files)
"""
import os, sys, json, subprocess, hashlib, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
OUT_JSON = os.path.join(BT, 'app', 'data', 'road-concordance.json'); OUT_MD = os.path.join(BT, 'library', 'ROAD-CONCORDANCE.md')
SCANS = os.path.join(ROOT, 'tmp', 'b1863', 'maps', 'scans')
CROPS = 'docs/battle-theatre/terrain/roadconc/crops/'
GAZ = json.load(open(os.path.join(BT, 'app', 'data', 'gazetteer.json'), encoding='utf-8'))
UNITS = json.load(open(os.path.join(BT, 'history', 'units.json'), encoding='utf-8'))['units']
TERR = json.load(open(os.path.join(BT, 'render', 'prototype', 'data', 'terrain.json')))
BOX = dict(lng0=TERR['lng0'], lng1=TERR['lng1'], lat0=TERR['lat0'], lat1=TERR['lat1'])

# ---------------------------------------------------------------- helpers
def gz(gid): return next(p for p in GAZ['places'] if p['id'] == gid)
def crossings(line, box=BOX):
    """where a polyline {lng,lat} crosses the rectangle (same rule as boxCrossings in src/history/gazetteer.mjs: all crossings, line order)"""
    inside = lambda p: box['lng0'] <= p['lng'] <= box['lng1'] and box['lat0'] <= p['lat'] <= box['lat1']
    out = []
    for a, b in zip(line, line[1:]):
        if inside(a) == inside(b): continue
        dx, dy = b['lng'] - a['lng'], b['lat'] - a['lat']; tmin, tmax = 0.0, 1.0
        for p, q in ((-dx, a['lng'] - box['lng0']), (dx, box['lng1'] - a['lng']), (-dy, a['lat'] - box['lat0']), (dy, box['lat1'] - a['lat'])):
            if p == 0:
                if q < 0: tmin = 2
            else:
                r = q / p
                if p < 0: tmin = max(tmin, r)
                else: tmax = min(tmax, r)
        if tmin <= tmax:
            t = tmin if inside(b) else tmax; out.append({'lng': round(a['lng'] + dx * t, 5), 'lat': round(a['lat'] + dy * t, 5)})
    return out
def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for ch in iter(lambda: f.read(1 << 20), b''): h.update(ch)
    return h.hexdigest()
def verify(q):
    r = subprocess.run([sys.executable, '-I', os.path.join(ROOT, 'tools', 'bt', 'or27_find.py'), '--verify', q], capture_output=True, text=True, encoding='utf-8', env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    out = r.stdout + r.stderr
    if 'NOT FOUND' in out or 'offsets' not in out: raise SystemExit('quotation not found in the OR text: ' + q)
    return out
children = {u['parent'] for u in UNITS if u['parent']}
leaf_ids = [u['id'] for u in UNITS if u['id'] not in children]
def leaves_under(uid): return [l for l in leaf_ids if l == uid or l.startswith(uid + '-')]
def or_ev(record, page, quote, role): return {'kind': 'or_text', 'record': record, 'page': page, 'quote': quote, 'role': role}

# ---------------------------------------------------------------- georeferences used (read from the committed transform files)
def tf(name): return json.load(open(os.path.join(ROOT, 'docs', 'basemap1863', 'maps', 'transforms', name + '.json'), encoding='utf-8'))
W, HK = tf('warren-1869'), tf('hopkins-1858-county')
GEOREF = {
    'warren_1869': {'source': 'Warren survey 1868-69, LOC 99448794 (cw0353500.jp2, 8878 x 9845 px)', 'transform': 'docs/basemap1863/maps/transforms/warren-1869.json', 'model': 'affine on 23 hand-read control points', 'fit_rmse_m': round(W['accuracy']['fit_rmse_m'], 1), 'loo_rmse_m': round(W['accuracy']['loo_rmse_m'], 1), 'loo_max_m': round(W['accuracy']['loo_max_m'], 1),
                    'known_limit': 'the sheet is 70 to 138 m out in the north-west corner (HISTORY-LAYER-NOTES DEC-011 item 10): a road there cannot be checked against the sheet to better than that; north of the town and east of the creek the sheet agrees with the roads layer to about 10 m (crossing checks below)'},
    'bachelder_1876_sheet1': {'source': 'Bachelder 1876, first day, LOC 99447491 (cw0325000a.jp2)', 'transform': 'docs/basemap1863/maps/transforms/bachelder-1876-sheet1.json (thin-plate scan to Warren px, then the Warren affine)', 'relative_to_warren_cv_rmse_m': 2.4, 'absolute_sigma_m': 16.7,
                              'note': 'the sheet is read for labels and for the line symbols compiled from the OR; its roads are the Warren roads'},
    'hopkins_1858_county': {'source': 'Hopkins, Map of Adams Co., Pennsylvania, 1858, LOC 2004629149 (la000697.jp2, 16639 x 11740 px)', 'transform': 'docs/basemap1863/maps/transforms/hopkins-1858-county.json', 'model': 'affine on 10 village dots', 'loo_rmse_m': round(HK['accuracy']['loo_rmse_m'], 0), 'grade': 'D (not for tracing)',
                            'use_here': 'TOPOLOGY ONLY: which village a road runs to and which landmark it passes (a drawn road with an owner or an institution on it); no coordinate is taken from it and no geometry is traced from it'},
}
SOURCES = {'warren_1869': ('cw0353500.jp2', 'LOC 99448794'), 'bachelder_1876_sheet1': ('cw0325000a.jp2', 'LOC 99447491'), 'hopkins_1858': ('la000697.jp2', 'LOC 2004629149')}
HASHES = {k: {'file': v[0], 'loc': v[1], 'sha256': sha(os.path.join(SCANS, v[0])) if os.path.exists(os.path.join(SCANS, v[0])) else None} for k, v in SOURCES.items()}

# crossing checks: the gazetteer crossing of the road with the edge of the loaded ground marked on the Warren sheet (tools/bt/roadconc/crosscheck.py), the drawn road centre read by eye on the zoomed crop (1.6x, +-3 px, about 1 m per px)
CROSSING_CHECKS = [
    {'road': 'Harrisburg Road', 'gazetteer': 'GZ-045', 'warren_px': [5607, 3007], 'drawn_road_offset_m': 11, 'reading_m': 3, 'crop': CROPS + 'crossing_harrisburg_road.jpg', 'result': 'the gazetteer crossing lies on the drawn road, about 11 m beside its centre line (inside the 16.5 m of the sheet)'},
    {'road': 'Carlisle Road', 'gazetteer': 'GZ-046', 'warren_px': [5304, 3019], 'drawn_road_offset_m': 1, 'reading_m': 3, 'crop': CROPS + 'crossing_carlisle_road.jpg', 'result': 'the gazetteer crossing lies on the drawn road (the label CARLISLE ROAD stands on it 1.5 km farther north)'},
    {'road': 'Taneytown Road', 'gazetteer': 'GZ-042', 'warren_px': [5548, 9034], 'drawn_road_offset_m': 12, 'reading_m': 3, 'crop': CROPS + 'crossing_taneytown_road.jpg', 'result': 'the gazetteer crossing lies on the drawn road, about 12 m beside its centre line'},
    {'road': 'Chambersburg Pike', 'gazetteer': 'GZ-040', 'warren_px': [3492, 3093], 'drawn_road_offset_m': None, 'reading_m': None, 'crop': CROPS + 'crossing_chambersburg_pike_nw_corner.jpg',
     'result': 'NOT USED AS A CHECK: the drawn pike lies about 110 m from the gazetteer crossing, which is the 70 to 138 m by which the Warren sheet is out in the north-west corner (DEC-011 item 10), not a measured error of the road; the modern centreline of the roads layer (sigma 48 m) is kept'},
    {'road': 'Hanover Road', 'gazetteer': 'GZ-043', 'warren_px': [8032, 4311], 'drawn_road_offset_m': None, 'reading_m': None, 'crop': CROPS + 'crossing_hanover_road_under_wood.jpg',
     'result': 'NOT CHECKED: the road is under the wood hachure at the crossing and cannot be read; the gazetteer crossing (sigma 57 m) is kept'},
]

# ---------------------------------------------------------------- the names
def road_cross(gid):
    p = gz(gid); cs = crossings(p['line'])
    return {'gazetteer_id': gid, 'road': p['name'], 'sigma_m': p['sigma_m'], 'crossings_of_the_loaded_ground': cs, 'basis': p.get('basis')}

NAMES = []
def add(e): NAMES.append(e); return e

add({
 'id': 'RC-01', 'period_name': 'Heidlersburg road', 'period_map_labels': ['Warren 1868-69: HARRISBURG ROAD', 'Bachelder 1876: HARRISBURG ROAD'], 'variants': ['the Heidlersburg road', 'Heidlersburg pike', 'the Heidlersburg pike', 'the direct road from Heidlersburg to Gettysburg'], 'ocr_forms': ['Heidlei-sburg road', 'Heidler.sLurg road'],
 'status': 'resolved', 'tier': 'inferred', 'resolves_to': road_cross('GZ-045'),
 'summary': 'Early, Hays and Blackford place the Heidlersburg road 1.5 to 2 miles north of the town where Bachelder draws Early’s line across the road that he and Warren label Harrisburg Road; Hopkins 1858 runs the road from Heidlersburg into Gettysburg past the Alms Houses on that road; no sheet prints the name Heidlersburg',
 'scope': 'the road from Heidlersburg that enters the field from the north-east: the part inside the loaded ground and the 2.5 km north of it where Early formed his line; farther north the road runs outside the ground and is not needed',
 'argument': ('Early marched down it and formed "across the Heidlersburg road", Hays arrived on it "within a mile and a half" of Gettysburg, Blackford deployed "2 miles from Gettysburg" with his left on the Heidlersburg pike, and Carter reports Doles, on the left of Rodes\' line, massing a large force "near the Heidlersburg road" (OR). '
              'Bachelder\'s first-day sheet draws exactly this line (Gordon, Hays, Hoke, Smith, Jones\' battalion, "Early\'s Division") across the road that Bachelder and Warren both label HARRISBURG ROAD, 2.4 to 2.6 km north of the borough centre (1.5 miles), '
              'and that road runs from there to the borough past the County Almshouse. Hopkins 1858 draws the road from Heidlersburg running south-west to Gettysburg and entering the borough past the "Alms Houses" on its drawn line; Warren shows the almshouse on the same road. '
              'Ewell\'s sentence names the Middletown road and the Heidlersburg road as two different roads in one breath, and Schurz (Eleventh Corps, whose right stood astride the Harrisburg road) feared the enemy advancing "by the Heidlersburg road" against his right. '
              'No source prints "Heidlersburg" on a road of the sheets; the identity rests on the agreement of the OR distances and positions with the drawn road, so the tier is inferred, not documented.'),
 'evidence': [
   or_ev('OR27-2-R470', '468', "formed my line across the Heidlersburg road, with Gordon's brigade on the right", 'Early: the line was formed across the road he marched in on'),
   or_ev('OR27-2-R472', '479', 'arrived with my brigade on the Heidlersburg road, within a mile and a half', 'Hays: 1.5 miles from Gettysburg'),
   or_ev('OR27-2-R527', '597', 'deployed 2 miles from Gettysburg, with the left resting upon the Heidlersburg pike', 'Blackford: the road at 2 miles'),
   or_ev('OR27-2-R470', '468', 'the road from my camp to Hunterstown was a very rough and circuitous one', 'Early: why he did not take the Hunterstown road'),
   or_ev('OR27-2-R531', '603', 'reported a large force massing on his front and left, near the Heidlersburg road', "Carter: on Doles' left the road is near the front of Rodes' left"),
   or_ev('OR27-1-R253', '728', "if any of the enemy's forces were advancing by the Heidlersburg road", 'Schurz: the road threatens the Eleventh Corps right (north of the town, astride the Harrisburg road)'),
   or_ev('OR27-2-R467', '~444', 'by the Middletown-road, sending word to Early to advance directly on the Heidlersburg road', 'Ewell: Rodes by the Middletown road, Early by the Heidlersburg road (two roads)'),
   {'kind': 'period_map', 'map': 'Bachelder 1876 sheet 1', 'scan': 'cw0325000a.jp2', 'where': 'scan px about (5800-6700, 1100-2300)', 'reads': 'Early\'s division line (GORDON, HAYS, HOKE, SMITH, JONES\' BATT.) drawn across the road labelled HARRISBURG ROAD', 'crop': CROPS + 'bachelder1_early_across_harrisburg_road.jpg', 'crop_recipe': 'tools/bt/roadconc/crop.py tmp/b1863/maps/scans/cw0325000a.jp2 5700 900 2000 1500 0.75'},
   {'kind': 'period_map', 'map': 'Warren 1868-69', 'scan': 'cw0353500.jp2', 'where': 'Warren px (6200-6500, 1500-2000) and (5600-5900, 2300-2800)', 'reads': 'HARRISBURG ROAD printed along the north-north-east road; COUNTY ALMSHOUSE beside it 1.1 km north of the borough', 'crop': CROPS + 'warren_carlisle_road_almshouse.jpg', 'crop_recipe': 'tools/bt/roadconc/crop.py tmp/b1863/maps/scans/cw0353500.jp2 4200 1800 2400 1950 0.62'},
   {'kind': 'period_map', 'map': 'Hopkins 1858 (county sheet)', 'scan': 'la000697.jp2', 'where': 'scan px (9200,4800) Heidlersburg to (7650,7580) Alms Houses', 'reads': 'the road from Heidlersburg runs south-west to Rock Creek and enters Gettysburg past the "Alms Houses" (labelled on the drawn road)', 'crop': CROPS + 'hopkins_heidlersburg_to_rockcreek.jpg', 'crop2': CROPS + 'hopkins_north_of_gettysburg.jpg', 'topology_only': True}],
 'alternatives_rejected': ['Hunterstown Road (GZ-058): Early did not take it ("the road from my camp to Hunterstown was a very rough and circuitous one", Early p. 468) and Bachelder\'s sheet labels it HUNTERSTOWN ROAD and it is a separate road from the borough', 'Carlisle Road (GZ-046): the road of the Middletown road, Rodes\' (RC-02)', 'York Pike (GZ-044): Brown prints the York road for Jones\' battalion (claim PD-2c-early-jones-05); a different road, kept as the unit\'s own printed road'],
 'claims': ['PD-2c-early-06', 'PD-2c-early-02', 'PD-2c-early-hays-01', 'PD-2c-early-hoke-01'], 'units': ['cs-2c-early'],
 'entry': 'where the Harrisburg Road crosses the north edge of the loaded ground (crossing check: on the drawn road within 11 m)'})

add({
 'id': 'RC-02', 'period_name': 'Middletown road', 'period_map_labels': ['Warren 1868-69: CARLISLE ROAD and NEWVILLE ROAD', 'Bachelder 1876: NEWVILLE ROAD'], 'variants': ['the Middletown road', 'Middletown road'], 'ocr_forms': ['Middletown-road'],
 'status': 'resolved', 'tier': 'inferred', 'resolves_to': road_cross('GZ-046'),
 'summary': 'Rodes puts Doles on the plain between the Middletown road and the foot of Oak Ridge, apart from the Mummasburg road that crosses the ridge; Bachelder draws Doles’s line across the road he labels Newville Road, which Warren labels Carlisle Road; no sheet prints the name Middletown road',
 'scope': 'the road by which Rodes\' division came down to the field from Middletown (Biglerville): the part inside the loaded ground and the 3 km north of it; the roads layer names it Carlisle Road, Warren labels it CARLISLE ROAD near the borough and NEWVILLE ROAD from the farm of W. Ross northward, Bachelder labels it NEWVILLE ROAD',
 'argument': ('Rodes names two roads in one report: the Mummasburg road, "which crossed the ridge at the base of the hill I held" (Oak Hill), and the Middletown road, whose "open plain between the Middletown road and the foot of the ridge" Doles\' brigade occupied. A road with a plain between it and the foot of Oak Ridge is the road east of the ridge, '
              'which on both sheets is the road labelled CARLISLE ROAD / NEWVILLE ROAD; the Mummasburg road is the one that crosses the ridge, so the Middletown road is not the Mummasburg road. Bachelder draws Doles\' line (DOLES GA., 1 P.M.) across the road he labels NEWVILLE ROAD. '
              'Schurz writes of "the Middletown and Mummasburg roads" as two roads at the Eleventh Corps\' right, west of which his division held the ground. Ewell and Early put Rodes on a different road from Early\'s Heidlersburg road (RC-01), and Lee says Rodes "arrived by the Middletown road". '
              'The roads that are left, the Harrisburg Road (Early\'s) and the Mummasburg Road (named separately), are excluded by those reports; the Table Rock Road joins this road 1.8 km north of the borough, north of the loaded ground. '
              'No sheet prints "Middletown" on the road and no report says "Carlisle road" for Rodes; the identity is by elimination and by the position of Doles\' line, so the tier is inferred. Hopkins 1858 shows the village of Middletown about 11 km north of the borough; it was not used for geometry or for the identity.'),
 'evidence': [
   or_ev('OR27-2-R506', '553', 'the open plain between the Middletown road and the foot of the ridge', 'Rodes: Doles on the plain between the road and the ridge foot'),
   or_ev('OR27-2-R506', '552', 'the Mummasburg road, which crossed the ridge at the base of the hill', 'Rodes: the Mummasburg road is another road'),
   or_ev('OR27-1-R253', '729', 'of the highest importance to hold the Middletown and Mummasburg roads', 'Schurz: two roads at the Eleventh Corps right'),
   or_ev('OR27-2-R467', '~444', 'by the Middletown-road, sending word to Early to advance directly on the Heidlersburg road', 'Ewell: two different roads for Rodes and Early'),
   or_ev('OR27-2-R470', '468', 'General Rodes had turned off at Middletown, and was moving toward the same place', 'Early: Rodes turned off at Middletown toward Gettysburg'),
   {'kind': 'period_map', 'map': 'Bachelder 1876 sheet 1', 'scan': 'cw0325000a.jp2', 'where': 'scan px about (4350-5300, 1000-2100)', 'reads': "NEWVILLE ROAD printed along the road; Rodes' division line and DOLES GA. 1 P.M. drawn across it, W. ROSS and CHAS. YEATTS beside it", 'crop': CROPS + 'bachelder1_newville_road_doles.jpg', 'crop_recipe': 'tools/bt/roadconc/crop.py tmp/b1863/maps/scans/cw0325000a.jp2 3500 500 2000 2000 0.7'},
   {'kind': 'period_map', 'map': 'Warren 1868-69', 'scan': 'cw0353500.jp2', 'where': 'Warren px (5300, 2400-2700) CARLISLE ROAD; (4900-5000, 1000-1500) NEWVILLE ROAD', 'reads': 'CARLISLE ROAD along the north road from the borough past the County Almshouse and Smithy; NEWVILLE ROAD along its continuation to the north-north-west', 'crop': CROPS + 'warren_carlisle_road_almshouse.jpg', 'crop2': CROPS + 'warren_newville_road_label_rotated.jpg'}],
 'alternatives_rejected': ['Mummasburg Road (GZ-047): named separately by Rodes and by Schurz', 'Harrisburg Road (GZ-045): Early\'s road (RC-01)', 'Table Rock Road (GZ-057): does not cross the loaded ground; it joins this road north of it'],
 'claims': ['PD-2c-rodes-02', 'PD-2c-rodes-04', 'PD-2c-rodes-carter-03'], 'units': ['cs-2c-rodes'],
 'entry': 'where the Carlisle Road crosses the north edge of the loaded ground (crossing check: on the drawn road within 1 m)'})

add({
 'id': 'RC-03', 'period_name': 'the Gettysburg road (Kershaw, from Fayetteville)', 'period_map_labels': ['Warren 1868-69: CHAMBERSBURG TURNPIKE (printed CHAMBERSBURG ... PIKE)'], 'variants': ['the Gettysburg road', 'Gettysburg road'],
 'status': 'resolved', 'tier': 'inferred', 'resolves_to': road_cross('GZ-040'),
 'summary': 'in Kershaw’s own march from Fayetteville the road occupied by Anderson’s division and the Gettysburg road are one road; Hill puts Fayetteville on the road from Chambersburg to Gettysburg and Wright puts Anderson’s division on the turnpike; this passage only',
 'scope': 'ONE PASSAGE ONLY: Kershaw\'s march of 1 July, report OR27-2-R432 p. 366, claim PD-1c-mclaws-kershaw-02. The phrase "the Gettysburg road" is not a name: in other reports it is the road to Gettysburg from wherever the writer came (RC-04)',
 'argument': ('Kershaw marched to Fayetteville on 30 June; on 1 July "Anderson\'s and Johnson\'s divisions and General Ewell\'s wagon train occupied the road until 4 p. m., when we marched to a point on the Gettysburg road, some 2 miles from that place". It is one march on one road from Fayetteville to the point 2 miles from Gettysburg: '
              '"the road" that Anderson\'s division (Third Corps) had occupied is, in Hill\'s report, "the road from Chambersburg to Gettysburg, near the village of Fayetteville", and Wright\'s report of Anderson\'s division prints the march "along the turnpike in the direction of Gettysburg" (AP-32); the roads layer and Warren (CHAMBERSBURG ... PIKE) name that road the Chambersburg Pike. '
              'The step "the road" to "the Gettysburg road" inside one sentence of Kershaw is the only link not printed, so the tier is inferred. It does not extend to the other brigades of McLaws\' division (their claims print no road).'),
 'evidence': [
   or_ev('OR27-2-R432', '366', 'marched to a point on the Gettysburg road, some 2 miles from that place', 'Kershaw: the road and the point'),
   or_ev('OR27-2-R432', '366', "Anderson's and Johnson's divisions and General Ewell's wagon train occupied the road", 'Kershaw: "the road" of the same march'),
   or_ev('OR27-2-R432', '366', 'Remained in camp until the 30th, when we marched to Fayetteville', 'Kershaw: the start of the march'),
   or_ev('OR27-2-R534', '606', 'encamped on the road from Chambersburg to Gettysburg, near the village of Fayetteville', 'Hill: Fayetteville is on the Chambersburg to Gettysburg road'),
   or_ev('OR27-2-R539', '622', 'took up the line of march along the turnpike in the direction of Gettysburg', "Wright (Anderson's division): the road of that division is the turnpike"),
   {'kind': 'period_map', 'map': 'Warren 1868-69', 'scan': 'cw0353500.jp2', 'where': 'Warren px (2700-4000, 2400-3100)', 'reads': 'CHAMBERSBURG ... PIKE printed along the turnpike west of the borough (J. Leafer, St. John, E. McPherson, Dustman on it); the road leaves the sheet toward Cashtown',
    'crop': CROPS + 'warren_with_gazetteer_chambersburg_pike.jpg', 'crop_recipe': 'tools/bt/roadconc/overlay.py 2700 2400 2400 1200 0.7 out.png "Chambersburg Pike" (the red line is the gazetteer line, about 100 m south-west of the drawn pike in this corner: the sheet’s known distortion)'}],
 'alternatives_rejected': ['Emmitsburg Road / Taneytown Road / Baltimore Pike: roads from other directions; nothing in the report puts Kershaw on them before the field'],
 'claims': ['PD-1c-mclaws-kershaw-02'], 'units': ['cs-1c-mclaws-kershaw'],
 'entry': 'where the Chambersburg Pike crosses the edge of the loaded ground (the crossing is in the north-west corner: the Warren sheet cannot check it, sigma 48 m kept)'})

add({
 'id': 'RC-04', 'period_name': 'the Gettysburg road (other passages)', 'variants': ['the Gettysburg road', 'the road leading to Gettysburg', 'the road to Gettysburg'],
 'status': 'unresolved', 'tier': 'unresolved', 'resolves_to': None,
 'reason': 'the phrase is not a name of a road: each writer means the road by which his own column came to Gettysburg (the Second Corps from Taneytown, the Eleventh from Emmitsburg, Kershaw from Fayetteville), and two or more roads of the gazetteer could carry it. No sheet and no report equates it with one road for these passages. The claims keep their place on the cards; none is placed by it.',
 'claims': ['POS-B-us-2c-1d-brooke-53pa-01', 'POS-B-us-2c-2d-hall-7mi-04', 'POS-B-us-2c-2d-hall-59ny-01', 'POS-B-us-2c-2d-webb-106pa-04', 'PD-1c-mclaws-barksdale-07'], 'units': ['us-2c-1d-brooke-53pa', 'us-2c-2d-hall', 'us-2c-2d-webb-106pa']})

add({
 'id': 'RC-05', 'period_name': 'the road from Scotland to Gettysburg (Johnson\'s division)', 'variants': ['the road from Scotland to Gettysburg', 'eastwardly, via Scotland, to Gettysburg', 'the road west of the mountains', 'the road from Shippensburg'],
 'status': 'unresolved', 'tier': 'unresolved', 'resolves_to': None,
 'reason': ('Scotland lies in Franklin County and on the Cumberland Valley line (Couch: "Scotland Bridge, 6 miles this side of Chambersburg", OR27-3-D1142 p. 548). Hopkins 1858 covers Adams County only and the Warren sheet ends about 5 km west of the borough, so no period map in the repository shows Scotland or the road from it. '
            'The reports say that Johnson "countermarched my division to Greenville, thence eastwardly, via Scotland, to Gettysburg" (Johnson), "marched from Carlisle by the road west of the mountains" (Lee) and that his division "came into the road from Shippensburg" (Longstreet, who does not name the road); none says which road it was on from the mountain to the field. '
            'To say the Chambersburg Pike would be a guess from the geography; the OR Atlas plates are not yet acquired (library/status.json). The 17 leaf units of Johnson\'s division stay an open gap.'),
 'evidence': [
   or_ev('OR27-2-R481', '503', 'countermarched my division to Greenville, thence eastwardly, via Scotland, to Gettysburg', 'Johnson'),
   or_ev('OR27-2-R426', '318', 'marched from Carlisle by the road west of the mountains', 'Lee'),
   or_ev('OR27-2-R430', '358', 'which came into the road from Shippensburg', 'Longstreet')],
 'claims': ['PD-2c-johnson-06', 'PD-2c-johnson-jones-42va-01', 'PD-2c-johnson-03'], 'units': ['cs-2c-johnson']})

add({
 'id': 'RC-06', 'period_name': 'Gettysburg and York Railroad', 'variants': ['the Gettysburg and York Railroad', 'the York railroad', 'the railroad depot'],
 'status': 'resolved_name_no_approach', 'tier': 'inferred',
 'resolves_to': {'layer': 'docs/basemap1863/features/roads-rail-water/railways.geojson', 'note': 'the Gettysburg (Hanover Junction, Hanover and Gettysburg) Railroad east of the borough; Warren prints GETTYSBURG AND HANOVER RAIL ROAD along it; it is the only railroad leaving the borough to the north-east on the sheets (the grade west of the borough was never laid)'},
 'argument': 'Johnson and Steuart say that on the night of 1 July the division moved "along the Gettysburg and York Railroad" to the north-east of the town and formed there; Steuart "marched through a part of the town and along the York railroad". Both describe a move inside the field after the unit reached it by another road, so the name gives no road of approach even though it can be placed. The name is not a gazetteer road and no approach record rests on it.',
 'evidence': [or_ev('OR27-2-R481', '504', 'Gettysburg and York Railroad', 'Johnson: the name as printed')],
 'claims': ['PD-2c-johnson-07', 'PD-2c-johnson-steuart-01', 'PD-2c-johnson-jones-01'], 'units': ['cs-2c-johnson'],
 'reason_no_approach': 'a move after arrival, inside the field'})

add({
 'id': 'RC-07', 'period_name': "the route by Horner's Mill (Eleventh Corps)", 'variants': ["the route by Horner's Mill", "the road past Horner's Mills", "by way of Horner's Mills"],
 'status': 'unresolved', 'tier': 'unresolved', 'resolves_to': None,
 'reason': ("a route named by a mill, not a road. Howard says the Second and Third Divisions took it (13 miles against 10 to 11 by the direct road), his dispatch of 1 July says it was chosen 'to relieve the direct road' and that the corps would encamp 'near J. Wintz's place, near the cross-roads, about 3 miles this side of Gettysburg'; Schurz passed Horner's Mills at 10.30. "
            "Hopkins 1858 prints Horner's mill and the Horner farms about 8 km south of the borough, near Rock Creek, but no source names the roads of the route, and where it met the road layer (the Emmitsburg road at the cross-roads, or another) is not stated. No road is traced from the map for it: the route would have to be invented between the mill and the cross-roads. The leaf units of the Eleventh Corps's Second and Third Divisions and artillery stay an open gap."),
 'evidence': [or_ev('OR27-1-R243', '701', "taking the route by Horner's Mill", 'Howard'), or_ev('OR27-3-D0959', '457', "the balance of the corps on the road past Horner's Mills", "Howard's dispatch of 1 July")],
 'claims': ['POS-A-11A-007', 'POS-A-CV1-038', 'POS-A-CV1-039'], 'units': ['us-11c-3d', 'us-11c-2d', 'us-11c-art'],
 'maps_read': [{'map': 'Hopkins 1858', 'crop': CROPS + 'hopkins_south_horner_mill.jpg', 'reads': "Horner's mill and farms near Rock Creek about 8 km south of the borough; no road is traced"}]})

add({
 'id': 'RC-08', 'period_name': 'the Fairfield road', 'variants': ['the Fairfield road', 'the road leading from Gettysburg to Fairfield', 'the road from Fairfield to Gettysburg'],
 'status': 'unresolved', 'tier': 'unresolved', 'resolves_to': None,
 'reason': "the gazetteer holds two roads that could carry the name (RD-010 Hagerstown Road, the road by the Black Horse Tavern, and RD-015 the road from the Peach Orchard, today Millerstown Road; data/gazetteer.json ambiguous_names). Warren prints HAGERSTOWN ROAD on the first; no sheet read here prints 'Fairfield road' on either. The claims that print it describe moves inside the field on 2 July (Kershaw) and the road of Humphreys' halt (Black Horse Tavern road, AP-07, which does not cross the loaded ground), so no approach is lost by leaving it open.",
 'claims': ['PD-1c-mclaws-kershaw-05', 'PD-1c-mclaws-kershaw-3sc-03', 'POS-B-us-3c-2d-carr-09', 'PD-2c-rodes-05'], 'units': ['cs-1c-mclaws-kershaw', 'us-3c-2d']})

add({
 'id': 'RC-09', 'period_name': 'the Waynesborough pike / the road to Emmitsburg of 30 June', 'variants': ['the Waynesborough pike', 'the Emmitsburg turnpike at Taneytown', 'the Emmitsburg road (3 miles from Taneytown)'],
 'status': 'unresolved', 'tier': 'unresolved', 'resolves_to': None,
 'reason': "roads of other places: the Waynesborough pike leaves Emmitsburg (Maryland) and the Taneytown to Emmitsburg road is not the Gettysburg to Emmitsburg road of the gazetteer although both are called 'the Emmitsburg road' in the reports. Neither enters the loaded ground; the ledger's gazetteer references to GZ-041 for these claims are by name only and are not used.",
 'claims': ['POS-B-us-3c-2d-05', 'POS-B-us-3c-2d-carr-11nj-03', 'POS-C-0324'], 'units': ['us-3c-2d', 'us-art-reserve']})

# name forms of gazetteer roads: no approach rests on them unless an approach record says so (identification field)
FORMS = [
 {'forms': ['Cashtown road', 'Cashtown turnpike', 'Cashtown pike', 'Chambersburg-Gettysburg turnpike', 'the road from Chambersburg to Gettysburg', 'Chambersburg road'], 'road': 'Chambersburg Pike', 'gazetteer_id': 'GZ-040', 'tier': 'inferred', 'basis': 'Warren prints CHAMBERSBURG TURNPIKE along it; the road leads to Cashtown (Hill R534 p. 606: Heth to Cashtown on the road from Chambersburg to Gettysburg); the ledger references GZ-040 for these claims'},
 {'forms': ['Emmitsburg pike', 'the road from Emmitsburg to Gettysburg', 'Gettysburg and Emmitsburg road'], 'road': 'Emmitsburg Road', 'gazetteer_id': 'GZ-041', 'tier': 'inferred', 'basis': 'the same road in AP-01 and AP-02 (identification text); the ledger references GZ-041'},
 {'forms': ['Taneytown pike', 'Gettysburg and Taneytown road', 'the road between Taneytown and Gettysburg', 'the road leading from Gettysburg to Taneytown'], 'road': 'Taneytown Road', 'gazetteer_id': 'GZ-042', 'tier': 'inferred', 'basis': 'the road named by its two ends; the ledger references GZ-042 (for POS-B-us-2c-20 "by inference")'},
 {'forms': ['Baltimore road', 'Baltimore pike', 'Baltimore turnpike', 'Baltimore and Gettysburg turnpike', 'Baltimore and Gettysburg pike'], 'road': 'Baltimore Pike', 'gazetteer_id': 'GZ-039', 'tier': 'inferred', 'basis': 'pike and road are one word in the reports; the ledger references GZ-039'},
 {'forms': ['Hanover turnpike', 'Gettysburg and Hanover turnpike'], 'road': 'Hanover Road', 'gazetteer_id': 'GZ-043', 'tier': 'inferred', 'basis': 'the ledger references GZ-043; the railroad of the same ends is another line (RC-06)'},
 {'forms': ['Baltimore and Harrisburg road'], 'road': 'Harrisburg Road', 'gazetteer_id': 'GZ-045', 'tier': 'inferred', 'basis': 'Dilger (R267 p. 754) places his advanced section "600 yards on our right, on the Baltimore and Harrisburg road"; the ledger references GZ-045; Warren prints HARRISBURG ROAD. Name form only: no approach rests on it'},
 {'forms': ['Hunterstown road'], 'road': 'Hunterstown Road', 'gazetteer_id': 'GZ-058', 'tier': 'documented', 'basis': 'Bachelder 1876 sheet 1 prints HUNTERSTOWN ROAD along the road (crop bachelder1_hunterstown_road_label.jpg); the gazetteer already holds the name'},
]

# ---------------------------------------------------------------- verify quotations, count units
for e in NAMES:
    for ev in e.get('evidence', []):
        if ev['kind'] == 'or_text': ev['verified_in_or_text'] = True; verify(ev['quote'])
    e['leaf_units_under'] = sum(len(leaves_under(u)) for u in e.get('units', []))
for e in NAMES:
    if e['status'] == 'resolved' and e.get('resolves_to'): e['resolves_to']['crossings_of_the_loaded_ground'] = crossings(gz(e['resolves_to']['gazetteer_id'])['line'])

DOC = {
 '_doc': 'Road-name concordance (DEC-014): for each period road name that a position-ledger claim prints and the gazetteer does not hold, what the period sources (Warren 1868-69, Bachelder 1876, Hopkins 1858, the Official Records) say it is. Written by tools/bt/roadconc/build_concordance.py; do not edit by hand. A name is never aliased to a road by guess: `unresolved` entries say why. `resolved` entries carry a tier (documented: a period map prints the name on the road or an OR report equates the names; inferred: sources of different kinds agree and none contradicts, argument and rejected alternatives written out). The history layer reads only `resolved` entries, through the approach records of data/claim-curation.json that name their id (`concordance`); the geometry used is always a gazetteer line, whose sigma is the gazetteer\'s.',
 'version': 1, 'built_by': 'tools/bt/roadconc/build_concordance.py (2026-10-22)',
 'georeference': GEOREF, 'sources_read': HASHES, 'crossing_checks': CROSSING_CHECKS,
 'traced_roads': [], 'traced_roads_note': 'none: every resolved name is a line the gazetteer already holds inside the loaded ground, and only its crossing with the edge of the ground matters; no segment was traced and none invented',
 'names': NAMES, 'forms': FORMS,
 'counts': {'names': len(NAMES), 'resolved': sum(1 for e in NAMES if e['status'] == 'resolved'), 'resolved_no_approach': sum(1 for e in NAMES if e['status'] == 'resolved_name_no_approach'), 'unresolved': sum(1 for e in NAMES if e['status'] == 'unresolved'), 'forms': len(FORMS)},
}
json.dump(DOC, open(OUT_JSON, 'w', encoding='utf-8'), indent=1, ensure_ascii=False); open(OUT_JSON, 'a').write('\n')

# ---------------------------------------------------------------- the markdown
def esc(s): return str(s if s is not None else '').replace('|', '\\|').replace('\n', ' ')
M = []
M += ['# Road-name concordance: period names that the repository did not hold (2026-10-22, DEC-014)', '',
      'Written by `python tools/bt/roadconc/build_concordance.py` from the hand-read evidence in that script; the data is `docs/battle-theatre/app/data/road-concordance.json`. Every quotation (fewer than 15 words) was re-verified against the OR text (`tools/bt/or27_find.py --verify`) when this file was built. Nothing here is a coordinate of a unit.', '',
      '## What this is, and what it is not', '',
      'Many reports print a road by a name the road layer does not carry (Heidlersburg road, Middletown road, the Gettysburg road, the road from Scotland, a route by a mill). The history layer draws a unit only where a road of approach resolves to a gazetteer line (DEC-009, DEC-012), so these names kept many leaf units out of the picture (108 in the v4 audit). '
      'This table says, name by name, what the period sources show. A name that the sources settle is `resolved` with a tier; a name they do not is `unresolved` with the reason and its units stay an open gap. **No road is aliased to another by guess, and no road was traced or invented:** every resolved name is a line the gazetteer already holds inside the loaded ground, and only its crossing with the edge of the ground matters.', '',
      '* Tiers: **documented** = a period map prints the name on the road, or an OR report equates the two names. **inferred** = sources of different kinds (OR text, period maps) agree on the identity and none contradicts it; the argument and the rejected alternatives are written out. **unresolved** = neither. No resolved name here is `documented`: no sheet read prints Heidlersburg or Middletown on a road, and no report equates them with a road the sheets label. That is stated, not hidden.',
      '* Sources read (hash in the JSON, library entries in `GOVERNANCE/library/acquired.json`): Warren 1868-69 (LOC 99448794), Bachelder 1876 first-day sheet (LOC 99447491), Hopkins 1858 county map (LOC 2004629149; used for TOPOLOGY only: its georeference is grade D, 376 m leave-one-out, and no coordinate or geometry was taken from it), OR Ser. I vol. 27 (local OCR text). The OR Atlas plates are not yet acquired (`library/status.json`).', '']
M += ['## Georeference and crossing checks', '', '| map | transform | error |', '|---|---|---|']
for k, g in GEOREF.items():
    if k == 'warren_1869': err = f"fit RMSE {g['fit_rmse_m']} m, leave-one-out {g['loo_rmse_m']} m (max {g['loo_max_m']} m); {g['known_limit']}"
    elif k == 'bachelder_1876_sheet1': err = f"relative to Warren {g['relative_to_warren_cv_rmse_m']} m, absolute {g['absolute_sigma_m']} m (1 sigma)"
    else: err = f"leave-one-out {g['loo_rmse_m']:.0f} m ({g['grade']}); {g['use_here']}"
    M.append(f"| {g['source']} | {g.get('transform')} | " + esc(err) + ' |')
M += ['', 'The crossing of a road with the edge of the loaded ground (the point where a column enters) is the gazetteer line\'s. It was checked against the Warren sheet by marking it on the sheet (`tools/bt/roadconc/crosscheck.py`) and reading the drawn road at 1.6x (about 1 m per pixel, reading +-3 px):', '',
      '| road | gazetteer crossing | Warren px | offset from the drawn road | result | crop |', '|---|---|---|---|---|---|']
for c in CROSSING_CHECKS:
    p = gz(c['gazetteer']); cr = crossings(p['line'])
    M.append(f"| {c['road']} ({c['gazetteer']}, sigma {p['sigma_m']} m) | " + ', '.join(f"{x['lng']}, {x['lat']}" for x in cr) + f" | {c['warren_px']} | " + (f"about {c['drawn_road_offset_m']} m (+-{c['reading_m']})" if c['drawn_road_offset_m'] is not None else 'not used') + f" | {esc(c['result'])} | `{c['crop'].split('/')[-1]}` |")
M += ['', 'Crops are in `docs/battle-theatre/terrain/roadconc/crops/` (JPEG, from the scans in `tmp/`, recipes in `tools/bt/roadconc/crop.py`, `rot.py`, `overlay.py`, `crosscheck.py`).', '']
M += ['## The names', '', '| id | period name | status | tier | resolves to | leaf units under the units whose claims print it |', '|---|---|---|---|---|---|']
for e in NAMES:
    M.append(f"| {e['id']} | {esc(e['period_name'])} | {e['status']} | {e['tier']} | " + (f"{e['resolves_to']['road']} ({e['resolves_to']['gazetteer_id']})" if e.get('resolves_to') and e['resolves_to'].get('gazetteer_id') else ('a railroad line (no approach)' if e['status'] == 'resolved_name_no_approach' else '-')) + f" | {e['leaf_units_under']} |")
M.append('')
for e in NAMES:
    M += [f"### {e['id']} {e['period_name']}", '', f"Variants printed: {', '.join('“' + esc(v) + '”' for v in e['variants'])}. Status **{e['status']}**, tier **{e['tier']}**.", '']
    if e.get('scope'): M += [f"Scope: {e['scope']}.", '']
    if e.get('resolves_to') and e['resolves_to'].get('gazetteer_id'):
        r = e['resolves_to']; M += [f"Resolves to **{r['road']}** ({r['gazetteer_id']}; {esc(r.get('basis'))}). Crossing(s) with the edge of the loaded ground: " + '; '.join(f"{x['lng']}, {x['lat']}" for x in r['crossings_of_the_loaded_ground']) + f". Geometry: the gazetteer line (sigma {r['sigma_m']} m); no new line.", '']
    elif e.get('resolves_to'): M += [f"Resolves to: {esc(e['resolves_to'].get('note'))}.", '']
    if e.get('argument'): M += ['Argument: ' + e['argument'], '']
    if e.get('reason'): M += ['Why unresolved: ' + e['reason'], '']
    if e.get('reason_no_approach'): M += ['Why no approach: ' + e['reason_no_approach'] + '.', '']
    if e.get('evidence'):
        M += ['| evidence | where | words (verified) | what it shows |', '|---|---|---|---|']
        for ev in e['evidence']:
            if ev['kind'] == 'or_text': M.append(f"| OR text | {ev['record']}, p. {ev['page']} | “{esc(ev['quote'])}” | {esc(ev['role'])} |")
            else: M.append(f"| {ev['map']} | {esc(ev['where'])}; scan {ev['scan']}" + (f"; crop `{ev['crop'].split('/')[-1]}`" if ev.get('crop') else '') + f" | - | {esc(ev['reads'])}" + (' (topology only)' if ev.get('topology_only') else '') + ' |')
        M.append('')
    if e.get('alternatives_rejected'): M += ['Rejected: ' + '; '.join(e['alternatives_rejected']) + '.', '']
    if e.get('claims'): M += ['Claims: ' + ', '.join('`' + c + '`' for c in e['claims']) + '. Units: ' + ', '.join('`' + u + '`' for u in e.get('units', [])) + f" ({e['leaf_units_under']} leaf units).", '']
    if e.get('entry'): M += ['Entry: ' + e['entry'] + '.', '']
M += ['## Name forms of roads the gazetteer holds', '', 'Forms that claims print for a road the gazetteer holds under another form. No approach rests on a form unless the approach record says so in its `identification` field; this table does not change `Gazetteer.resolve`.', '', '| printed forms | road | tier | basis |', '|---|---|---|---|']
for f in FORMS: M.append(f"| {esc('; '.join(f['forms']))} | {f['road']} ({f['gazetteer_id']}) | {f['tier']} | {esc(f['basis'])} |")
M += ['', '## Not done, and why', '',
      '* No road was traced from a map: the three resolved names are lines the gazetteer holds inside the loaded ground, and the crossing is the only place a column enters. The north-east and north roads were checked against Warren at the crossing (11 m and 1 m); the pike (north-west corner) and the Hanover road (under hachure) could not be checked and keep their gazetteer sigma.',
      '* No period map prints Heidlersburg or Middletown on a road, so RC-01 and RC-02 are inferred, not documented. The OR Atlas plates (not yet acquired) and the Bachelder tactical sheets might print them; the owner may add them to the library (see `GOVERNANCE/library/status.json`).',
      '* The road from Scotland (Johnson, 17 leaf units) and the route by Horner\'s Mill (Eleventh Corps, 23 leaf units) need a period map of Franklin County or of the Emmitsburg side; the repository has none. They stay open gaps, marked on the cards.', '']
open(OUT_MD, 'w', encoding='utf-8').write('\n'.join(M) + '\n')
print('written', OUT_JSON, OUT_MD, DOC['counts'])
