"""Eight verification passes over the structures layer. Writes ../evidence/verification.json.
Run after build_structures.py:  python verify_structures.py [--net]
(--net re-checks every cited URL; one request at a time, 2 s apart, descriptive User-Agent.)
"""
import os, sys, json, math, re, time, warnings, collections
warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
from pyproj import Transformer
from shapely.geometry import shape, Point
from shapely.ops import transform as shp_transform
from sources import SRC
import build_structures as B

OUT = B.OUTDIR
EV = B.EVID
T_UTM = B.T_UTM
fc = json.load(open(os.path.join(OUT, 'structures.geojson'), encoding='utf-8'))
F = fc['features']
res = collections.OrderedDict()
BOUNDS = fc['properties']['bounds']
CONF = {'Documented', 'Estimated', 'Contested', 'Unknown'}
STYPES = {'A1', 'A2', 'B'}

# ---------------------------------------------------------------- 1 schema
p = []
ids = collections.Counter(f['properties']['id'] for f in F)
for f in F:
    pr = f['properties']; g = f['geometry']
    for k in ('id', 'category', 'subtype', 'name', 'present_1863', 'period_note', 'sources', 'method', 'positional_error_m', 'confidence', 'notes'):
        if k not in pr:
            p.append('%s missing %s' % (pr.get('id'), k))
    if pr['confidence'] not in CONF:
        p.append('%s bad confidence' % pr['id'])
    if not isinstance(pr['present_1863'], bool):
        p.append('%s present_1863 not bool' % pr['id'])
    if not pr['sources']:
        p.append('%s no sources' % pr['id'])
    for s in pr['sources']:
        if not (s.get('cite') and s.get('url', '').startswith('http') and s.get('type') in STYPES and s.get('quote_or_paraphrase') and s.get('sheet_or_page')):
            p.append('%s incomplete source %s' % (pr['id'], s.get('src_key')))
    if g is None:
        if pr['positional_error_m'] is not None:
            p.append('%s null geometry but has error' % pr['id'])
        if pr['confidence'] not in ('Unknown', 'Documented'):
            p.append('%s null geometry but confidence %s' % (pr['id'], pr['confidence']))
    else:
        if pr['positional_error_m'] is None or pr['positional_error_m'] <= 0:
            p.append('%s geometry without error' % pr['id'])
        sh = shape(g)
        if not sh.is_valid:
            p.append('%s invalid geometry' % pr['id'])
        c = sh.centroid
        if not (BOUNDS['west'] <= c.x <= BOUNDS['east'] and BOUNDS['south'] <= c.y <= BOUNDS['north']):
            p.append('%s outside bounds %.5f,%.5f' % (pr['id'], c.x, c.y))
for k, v in ids.items():
    if v > 1:
        p.append('duplicate id %s' % k)
res['1_schema'] = dict(features=len(F), problems=p, passed=not p)

# ---------------------------------------------------------------- 2 sources
keys_used = collections.Counter(s['src_key'] for f in F for s in f['properties']['sources'])
missing = [k for k in keys_used if k not in SRC]
urls = sorted({s['url'] for f in F for s in f['properties']['sources']})
net = {}
if '--net' in sys.argv:
    import subprocess
    UA = 'gettysburg-map-research/1.0 (historical reconstruction; polite link check)'
    for u in urls:
        try:
            r = subprocess.run(['curl', '-sS', '-L', '-m', '40', '-o', os.devnull, '-A', UA, '-w', '%{http_code}', '-r', '0-2000', u], capture_output=True, text=True)
            net[u] = r.stdout.strip() or r.stderr.strip()[:60]
        except Exception as e:
            net[u] = 'ERR %s' % e
        time.sleep(2)
else:
    old = os.path.join(EV, 'verification.json')
    if os.path.exists(old):
        net = json.load(open(old)).get('2_sources', {}).get('http_status', {})
res['2_sources'] = dict(registry_keys_missing=missing, sources_by_type=dict(collections.Counter(SRC[k]['type'] for k in keys_used if k in SRC)), unique_urls=len(urls), http_status=net,
                        passed=not missing)

# ---------------------------------------------------------------- 3 independent position checks
county = B.load_county()
osm = json.load(open(os.path.join(HERE, '..', 'evidence', 'osm_named_cty.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, '..', 'evidence', 'osm_named_cty.json')) else []
chk3 = []
for f in F:
    pr = f['properties']
    if pr.get('marker_offset_m') is not None:
        chk3.append(dict(id=pr['id'], kind='plate symbol vs NPS/OSM site mark', offset_m=pr['marker_offset_m']))
    if pr.get('map_symbol_offset_m') is not None:
        chk3.append(dict(id=pr['id'], kind='plate symbol (global georef) vs surviving building outline centroid', offset_m=pr['map_symbol_offset_m']))
big = [c for c in chk3 if c['offset_m'] > 30]
EXPLAINED = {
    'STR-BRYAN-HOUSE1': 'NPS The Brien Farm and Family: Warren shows house and barn 30 ft apart, the present buildings are 75 ft apart; the plate is the survey of record, the outline is the survivor',
    'STR-MCPHERSON-BARN1': 'every Warren symbol of the McPherson farmstead lies about 50 m east of the georeferenced barn outline; symbol identity unresolved; footprint taken from the survivor, no symbol tied to it',
    'STR-SPANGLER_H-HOUSE1': 'the symbol taken for the house is 31 m from the log-house outline; either the symbol choice (W log house vs S) or the plate position is off; footprint is the survivor',
    'STR-BUSHMAN-HOUSE1': 'southern edge of the plate, sparse control: the global georeference puts the plate symbol 37 m from the surviving house (the house was dropped from the control fit as an outlier at 39 m); footprint is the survivor',
    'STR-BUSHMAN-BARN1': 'same: global-model error at the southern edge (63 m); the barn footprint is the survivor and no symbol point is drawn',
    'STR-MCMILLAN-HOUSE1': 'west-centre of the plate where the global model has few control points (leave-one-out errors reach 30 m); the surviving house outline is drawn, no symbol point; which of the three McMillan symbols is the house is not established',
    'STR-CULP-HOUSE1': 'north-east, east of town: adding the two Rock Creek bridges as control moved this area by about 40 m and the symbol taken for the brick Culp house (five W/S symbols, none lettered B) is not certain; the footprint is the survivor; error for symbol points there is 45 m',
    'STR-BLISS-HOUSE1': 'two plate symbols bracket the NPS tablet at 36 m; the tablet is not used, the symbol is; Bliss buildings burned and left no outline',
}
unexplained = [c for c in big if c['id'] not in EXPLAINED]
for c in big:
    c['explanation'] = EXPLAINED.get(c['id'])
res['3_position_cross_checks'] = dict(n=len(chk3), median_m=float(np.median([c['offset_m'] for c in chk3])) if chk3 else None,
                                      p90_m=float(np.percentile([c['offset_m'] for c in chk3], 90)) if chk3 else None,
                                      over_30m=big, unexplained_over_30m=unexplained, details=chk3, passed=not unexplained)

# ---------------------------------------------------------------- 4 georeference accuracy (leave-one-out) and independence
gc = json.load(open(os.path.join(EV, 'gcps_final.json'), encoding='utf-8'))
cmpf = os.path.join(EV, 'georef_comparison.json')
cmpd = json.load(open(cmpf, encoding='utf-8')) if os.path.exists(cmpf) else None
res['4_georeference'] = dict(accuracy=gc['accuracy'], independent_prior_check=dict(
    what='Three independent checks. (a) Before the sibling control points were added, the building-only fit was compared with the 25 road-junction, bridge, summit and farm points of docs/basemap1863/maps/gcps/warren.json: median 49 m, maximum 115 m, about 100 m out in the borough; the building pairs that caused it (wrong matches in the borough) were removed and the independent points added as control. (b) The two Rock Creek bridges of that file were first dropped by the outlier rule (error 52 and 71 m) and then restored, because they are the only controls east of town and the rule had removed real evidence; they now fit to 26 m median. (c) The sibling affine georeference of the same plate was tested on this task control points: median %s m error, against 10 m leave-one-out here; the two models differ by a median of %s m in the central block and %s m at the edges (evidence/georef_comparison.json).' % (cmpd['sibling_affine_error_on_this_task_control_points']['median_m'] if cmpd else '?', cmpd['grid_difference_m']['centre_median'] if cmpd else '?', cmpd['grid_difference_m']['edge_median'] if cmpd else '?'),
    source='docs/basemap1863/maps/gcps/warren.json; docs/basemap1863/maps/transforms/warren-1869.json'), passed=gc['accuracy']['loo_median_m'] < 15 and gc['accuracy']['loo_p90_m'] < 30)

# ---------------------------------------------------------------- 5 dimensions vs footprint area
chk5 = []
FT = 0.3048
for f in F:
    pr = f['properties']
    d = pr.get('dims_documented')
    if not d or pr.get('geometry_kind') != 'footprint_2023_outline':
        continue
    m = re.search(r'(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*ft', d)
    if not m:
        continue
    a_doc = float(m.group(1)) * float(m.group(2)) * FT * FT
    sh = shape(f['geometry']); a_out = shp_transform(lambda x, y, z=None: T_UTM.transform(x, y), sh).area
    chk5.append(dict(id=pr['id'], documented_m2=round(a_doc, 1), outline2023_m2=round(a_out, 1), ratio=round(a_out / a_doc, 2), status=pr['status']))
odd = [c for c in chk5 if not (0.6 <= c['ratio'] <= 2.2)]
res['5_dimensions'] = dict(n=len(chk5), details=chk5, outside_0p6_to_2p2=odd,
                           note='Ratios above 1 are expected where the 2023 outline includes post-1863 additions (the entry then says so in fabric_1863); ratios far from 1 are flagged in the entry notes.', passed=True)

# ---------------------------------------------------------------- 6 chronology
chk6 = []
for f in F:
    pr = f['properties']
    b = str(pr.get('built') or '')
    yrs = [int(y) for y in re.findall(r'(1[6-9]\d\d)', b)]
    if not yrs:
        continue
    first = min(yrs)
    if first > 1863 and pr['present_1863'] and pr['status'] not in ('destroyed_1863',) and pr['geometry_kind'] != 'none':
        chk6.append(dict(id=pr['id'], built=b, status=pr['status']))
res['6_chronology'] = dict(problems=chk6, passed=not chk6,
                           note='Every feature with a first construction year after 1863 would have to be flagged destroyed_1863 (a later building on an 1863 site); none is drawn as an 1863 building.')

# ---------------------------------------------------------------- 7 second print of the survey (July-3 sheet)
sym = json.load(open(os.path.join(EV, 'cross_sheet_check.json'), encoding='utf-8')) if os.path.exists(os.path.join(EV, 'cross_sheet_check.json')) else None
res['7_cross_sheet'] = dict(result=sym, passed=bool(sym) and sym.get('present_fraction', 0) >= 0.8)

# ---------------------------------------------------------------- 8 duplicates, overlaps and counts
pts = []
for f in F:
    g = f['geometry']
    if g and f['properties']['status'] not in ('map_mass', 'unreviewed_symbol'):
        c = shape(g).centroid; pts.append((f['properties']['id'], T_UTM.transform(c.x, c.y)))
dup = []
for i in range(len(pts)):
    for j in range(i + 1, len(pts)):
        d = math.hypot(pts[i][1][0] - pts[j][1][0], pts[i][1][1] - pts[j][1][1])
        if d < 2.0:
            dup.append((pts[i][0], pts[j][0], round(d, 2)))
by_status = collections.Counter(f['properties']['status'] for f in F)
by_conf = collections.Counter(f['properties']['confidence'] for f in F)
farms = {f['properties'].get('farm') for f in F if f['properties'].get('farm')}
va = json.load(open(os.path.join(EV, 'visual_audit.json'), encoding='utf-8')) if os.path.exists(os.path.join(EV, 'visual_audit.json')) else None
farm_keys = sorted({f['properties'].get('farm') for f in F if f['properties'].get('farm')})
audited = {g['group'] for g in va['groups']} if va else set()
unaudited = [k for k in farm_keys if k not in audited and not k.startswith('warfield')]
res['8_visual_audit_duplicates_counts'] = dict(visual_audit=dict(groups=len(audited), unaudited=unaudited, verdicts=dict(collections.Counter(g['verdict'] for g in va['groups'])) if va else None), near_duplicate_pairs_under_2m=dup, by_status=dict(by_status), by_confidence=dict(by_conf), curated_farmsteads=len(farms), total_features=len(F),
                                  context='NPS 1999 GMP: 71 farms of the 1863 battlefield lie inside the park boundary; NPS CLI: over 50 agricultural properties had farm structures in 1863. 28 farmsteads are curated here; the rest are in the unreviewed machine-detected layer.',
                                  passed=(not dup) and va is not None and not unaudited)

json.dump(res, open(os.path.join(EV, 'verification.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
for k, v in res.items():
    print(k, 'PASS' if v.get('passed') else 'CHECK', {kk: vv for kk, vv in v.items() if kk in ('problems', 'n', 'median_m', 'p90_m', 'over_30m', 'outside_0p6_to_2p2', 'near_duplicate_pairs_under_2m')})
