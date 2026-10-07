"""Pack the vector layers into data/vectors.mjs (named export VECTORS): quantised to the z18 world-pixel grid, delta + zigzag-varint coded, base64.
Inputs: Census TIGER/Line via TIGERweb (roads, rail, streams, water; cached by fetch-vectors.py), contours (build-contours.py), the 30 + 3 + 8 place marks of the prototype dataset.
Usage: python build-vectors.py"""
import base64, json, math, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *

Q = 18
SCALE = 2 ** (Q + 9)
BUILD = os.path.join(ROOT, 'tmp', 'look-dev', 'basemap', 'build')
TIGER = os.path.join(CACHE, 'tiger')


def ux(lng):
    return (lng + 180) / 360


def uy(lat):
    s = math.sin(math.radians(lat))
    return 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)


def zz(v):
    return (v << 1) ^ (v >> 63) if v < 0 else v << 1


def varint(out, v):
    v = zz(v)
    while v > 127:
        out.append((v & 127) | 128)
        v >>= 7
    out.append(v)


def encode(lines):
    """lines: list of list of (ux, uy) unit coordinates -> base64 of [n, x0, y0, dx, dy, ...]"""
    out = bytearray()
    for pts in lines:
        q = [(int(round(x * SCALE)), int(round(y * SCALE))) for x, y in pts]
        d = [q[0]]
        for a, b in zip(q, q[1:]):
            if b != a:
                d.append(b)
        if len(d) < 2:
            continue
        varint(out, len(d))
        px = py = 0
        for x, y in d:
            varint(out, x - px)
            varint(out, y - py)
            px, py = x, y
    return base64.b64encode(bytes(out)).decode()


def lng_lat_lines(feat):
    g = feat['geometry']
    if g['type'] == 'LineString':
        return [g['coordinates']]
    if g['type'] == 'MultiLineString':
        return g['coordinates']
    if g['type'] == 'Polygon':
        return g['coordinates']
    if g['type'] == 'MultiPolygon':
        return [r for poly in g['coordinates'] for r in poly]
    return []


def to_unit(coords):
    return [(ux(c[0]), uy(c[1])) for c in coords]


def length_m(coords):
    t = 0.0
    for a, b in zip(coords, coords[1:]):
        t += math.hypot((b[0] - a[0]) * 85400, (b[1] - a[1]) * 111195)
    return t


EXPAND = [(r'\bCrk\b', 'Creek'), (r'\bAly\b', 'Alley'), (r'\bCsx\b', 'CSX'), (r'\bRR\b', 'Railroad'), (r'\bTrl\b', 'Trail'), (r'\bLk\b', 'Lake'), (r'\bExd\b', 'Extended'), (r'\bTct\b', 'Tract')]


def nice(name):
    for a, b in EXPAND:
        name = re.sub(a, b, name)
    return name


def load(n):
    return json.load(open(os.path.join(TIGER, n + '.geojson'), encoding='utf8'))['features']


layers = {'water': [], 'streams': [], 'roads': [], 'rail': [], 'contours': []}
# ---- roads -------------------------------------------------------------------------------------------------------------------------------------------------------------------
CLS = {'S1100': 'primary', 'S1200': 'secondary', 'S1400': 'local', 'S1640': 'local', 'S1630': 'local', 'S1740': 'trail', 'S1710': 'trail', 'S1730': 'trail', 'S1780': 'trail', 'S1500': 'trail', 'S1820': 'trail', 'S1830': 'trail'}
groups = {}
for name in ('primary', 'secondary', 'local'):
    for f in load(name):
        cls = CLS.get(f['properties']['MTFCC'], 'trail')
        nm = nice(f['properties'].get('NAME') or '')
        key = (cls, nm if cls in ('primary', 'secondary', 'local') else '')
        groups.setdefault(key, []).extend(lng_lat_lines(f))
for (cls, nm), ls in sorted(groups.items()):
    tot = sum(length_m(l) for l in ls)
    g = {'cls': cls, 'd': encode([to_unit(l) for l in ls])}
    if nm:
        g['name'] = nm
    if cls == 'local' and nm and tot >= 450:
        g['label'] = True
    layers['roads'].append(g)
# ---- rail ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
layers['rail'].append({'d': encode([to_unit(l) for f in load('rail') for l in lng_lat_lines(f)])})
# ---- streams (named ones from z13, the rest from z14.6) and water bodies ---------------------------------------------------------------------------------
sg = {}
for f in load('streams'):
    nm = nice(f['properties'].get('NAME') or '')
    sg.setdefault(nm, []).extend(lng_lat_lines(f))
for nm, ls in sorted(sg.items()):
    g = {'d': encode([to_unit(l) for l in ls])}
    if nm:
        g['name'] = nm
    else:
        g['minZoom'] = 14.6
    layers['streams'].append(g)
layers['water'].append({'d': encode([to_unit(r) for f in load('water') for r in lng_lat_lines(f)])})
# ---- contours (merc metres -> unit) ------------------------------------------------------------------------------------------------------------------------------
c = json.load(open(os.path.join(BUILD, 'contours.json')))
tiers = json.load(open(os.path.join(os.path.dirname(__file__), 'tiers.json')))
core16 = {(x, y) for x, y, _ in tiers['z16']}                  # the 10 ft lines only where the z16 imagery exists (they appear from zoom 14.8)
span16 = TILE * mpp(16)
def in_core(l):
    m = l[len(l) // 2]
    return (int((m[0] + ORIGIN) // span16), int((ORIGIN - m[1]) // span16)) in core16
for kind in ('major', 'minor'):
    src = [l for l in c[kind] if kind == 'major' or in_core(l)]
    lines = [[((m[0] + ORIGIN) / (2 * ORIGIN), (ORIGIN - m[1]) / (2 * ORIGIN)) for m in l] for l in src]
    layers['contours'].append({'kind': kind, 'd': encode(lines)})
    print('contours', kind, len(src), 'of', len(c[kind]), 'lines kept')
# ---- place marks ----------------------------------------------------------------------------------------------------------------------------------------------------------
ds = json.load(open(os.path.join(ROOT, 'docs', 'pitch', 'anim', 'prototype', 'data', 'dataset.json'), encoding='utf8'))['terrain']
disputed = set(ds['disputed'])
places = []
for l in ds['locations']:
    nm = l.get('displayName') or l['name']
    if nm == "Gulp's Hill saddle":
        nm = "Gulp's Hill saddle [sic]"
    places.append({'id': l['id'], 'n': nm, 'k': 'loc', 'lng': l['lng'], 'lat': l['lat'], 'plng': l['productionLng'], 'plat': l['productionLat'], 'd': l['id'] in disputed})
for l in ds['features']:
    places.append({'id': l['id'], 'n': l['name'], 'k': 'feat', 'lng': l['lng'], 'lat': l['lat']})
for l in ds['structures']:
    places.append({'id': l['id'], 'n': l['name'], 'k': 'struct', 'lng': l['lng'], 'lat': l['lat']})
gt = os.path.join(BASEMAP, 'data', 'ground-truth.json')
if os.path.exists(gt):
    g = json.load(open(gt, encoding='utf8'))
    for p in places:
        if p['id'] in g:
            p['glng'], p['glat'] = g[p['id']]['lng'], g[p['id']]['lat']
            p['ev'] = 'Measured'
pc = os.path.join(BASEMAP, 'data', 'place-checks.json')                          # marks the landmark check found not at the thing they name (verify/landmark-report.py): drawn with a dashed ring
if os.path.exists(pc):
    c = json.load(open(pc, encoding='utf8'))
    for p in places:
        if p['id'] in c:
            p['off'] = c[p['id']]['off_m']
data = {'format': 'gb-vectors/1', 'q': Q,
        'sources': ['Roads, railroad, streams, water: US Census Bureau TIGER/Line via TIGERweb (public domain)', 'Contours: computed from the USGS 3DEP DEM (public domain)', 'Place marks: the site terrain.json (legacy and production frames)'],
        'layers': layers, 'places': places}
os.makedirs(os.path.join(BASEMAP, 'data'), exist_ok=True)
js = json.dumps(data, separators=(',', ':'))
with open(os.path.join(BASEMAP, 'data', 'vectors.mjs'), 'w', encoding='utf8') as f:
    f.write('// generated by tools/build-vectors.py - roads, rail, streams, water, contours and place marks, quantised (named export so the Studio bundler can inline it)\nexport const VECTORS = ' + js + ';\n')
sizes = {k: sum(len(g.get('d', '')) for g in v) for k, v in layers.items()}
print('vectors.mjs bytes', len(js), 'per layer (base64 chars):', sizes, 'places', len(places))
