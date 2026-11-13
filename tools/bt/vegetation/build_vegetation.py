"""Build docs/battle-theatre/app/data/vegetation.json: the vegetation of July 1863 (requirement R20, gate Q21).

    python -I tools/bt/vegetation/verify_claims.py && python -I tools/bt/vegetation/build_vegetation.py
    python -I tools/bt/vegetation/build_vegetation.py --check        # exit 1 if the committed file is not what this script makes

What it reads (nothing is fetched):
  docs/basemap1863/features/landcover/*.geojson   woods, orchards, scattered trees, marsh, boulder ground, the cleared Little Round Top slope, the Wheatfield,
                                                  the open ground (Warren survey 1868-69, georeferenced to 30-40 m; the layer's own notes say what it is not)
  docs/basemap1863/features/roads-rail-water/     roads, lanes, railways (cut out of the fields: the structures layer draws them)
  docs/battle-theatre/app/data/structures3d.json  farmsteads (building footprints with their farm), the 30 period-confirmed fence lines (field boundaries)
  docs/battle-theatre/app/data/gazetteer.json     named places
  tools/bt/vegetation/claims_verified.json        every cited claim, its quote looked up again in the saved source text (verify_claims.py)

What it makes: units (woodlots, orchards, tree clusters, thickets, marsh, boulder ground, the cleared slope, the Wheatfield and FIELD CELLS), each with a land cover, a
crop or canopy description, a schedule by date (the calendar below, with the unit's seeded offsets), damage events, the claims that bear on it with their role (exact, nearest,
area) and a tier for each attribute. The calendar, the district's crop mix, the species weights and every number that is not read from a source are ranged and tagged
plausible-procedural or inferred; each such choice is listed in `gaps` and proposed for the Evidence-Gap Register.

Field cells: the open ground is cut by the roads, lanes, railway and the confirmed fence lines, and the pieces larger than about 28 acres are divided by a seeded
Voronoi relaxation into cells of about 14 acres. The CUT LINES INSIDE A BLOCK ARE NOT KNOWN (no source maps them): every field cell says its geometry is plausible-procedural.
Which crop a cell holds is documented only where a claim names it and can be placed (the Wheatfield; a few others, role nearest, tier inferred); every other cell is a seeded
draw from the district mix computed here from the damage-claim acreages of nine farms (tier plausible-procedural).
"""
import os, sys, json, math, random, hashlib, argparse, collections
import numpy as np
from shapely.geometry import shape, mapping, Point, LineString, MultiPolygon, Polygon, box
from shapely.ops import unary_union, polygonize, transform
import shapely
from pyproj import Transformer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
LC = os.path.join(ROOT, 'docs', 'basemap1863', 'features', 'landcover')
RRW = os.path.join(ROOT, 'docs', 'basemap1863', 'features', 'roads-rail-water')
OUT = os.path.join(BT, 'app', 'data', 'vegetation.json')
CLAIMS = os.path.join(HERE, 'claims_verified.json')
SCHEMA = 'bt-vegetation/1'

TO_M = Transformer.from_crs(4326, 32618, always_xy=True)
TO_LL = Transformer.from_crs(32618, 4326, always_xy=True)
ACRE = 4046.8564224

FARMS = {
    'trostle': 'Abraham (Catherine) Trostle farmstead', 'brien': 'Abraham Brien (Bryan) farmstead', 'klingel': 'Daniel Klingel farmstead', 'mcmillan': 'David McMillan farmstead',
    'mcpherson': 'Edward McPherson farmstead', 'g_weikert': 'George Weikert farmstead', 'h_spangler': 'Henry Spangler farmstead', 'hummelbaugh': 'Jacob Hummelbaugh farmstead',
    'rose': 'John Rose farmstead', 'slyder': 'John Slyder farmstead', 'j_weikert': 'John Weikert farmstead', 'wentz': 'John Wentz farmstead (Peach Orchard)',
    'sherfy': 'Joseph Sherfy farmstead (Peach Orchard)', 'leister': 'Lydia Leister farmstead (Meade headquarters)', 'fry': 'M. Fry (Frey) farmstead', 'bushman': 'Michael Bushman farmstead',
    'codori': 'Nicholas Codori farmstead', 'rogers': 'Peter Rogers farmstead', 's_patterson': 'S. Patterson farmstead', 'warfield_snyder': 'Warfield / Snyder farmsteads',
    'bliss': 'William Bliss farmstead', 'culp': 'William/Henry Culp farmstead (Rock Creek)'}

# ---------------------------------------------------------------------------------------------------------------- helpers
def rnd(*key):
    """a deterministic number in [0,1) from any key"""
    h = hashlib.sha256('|'.join(str(k) for k in key).encode()).digest()
    return int.from_bytes(h[:8], 'big') / 2 ** 64


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def to_m(g):
    return shapely.transform(g, lambda a: np.column_stack(TO_M.transform(a[:, 0], a[:, 1])))


def to_ll(g):
    return shapely.transform(g, lambda a: np.column_stack(TO_LL.transform(a[:, 0], a[:, 1])))


def polys(g):
    if g.is_empty:
        return []
    if g.geom_type == 'Polygon':
        return [g]
    if g.geom_type in ('MultiPolygon', 'GeometryCollection'):
        out = []
        for p in g.geoms:
            out += polys(p)
        return out
    return []


def ring_flat(ring, nd=5):
    out = []
    for x, y in list(ring.coords)[:-1]:
        out += [round(x, nd), round(y, nd)]
    return out


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


# ---------------------------------------------------------------------------------------------------------------- inputs
def ground_box():
    t = load(os.path.join(BT, 'render', 'prototype', 'data', 'terrain.json'))
    return t, to_m(box(t['lng0'], t['lat0'], t['lng1'], t['lat1']))


def farm_anchors():
    s = load(os.path.join(BT, 'app', 'data', 'structures3d.json'))
    by = collections.defaultdict(list)
    inv = {v: k for k, v in FARMS.items()}
    for b in s['buildings']:
        if b.get('farm') in inv and b.get('ring'):
            by[inv[b['farm']]].append(np.array(b['ring']).mean(0))
    for p in s['points']:
        if p.get('farm') in inv:
            xy = p.get('pt')
            if xy:
                by[inv[p['farm']]].append(np.array(xy))
    out = {}
    for k, v in by.items():
        c = np.mean(v, 0)
        out[k] = Point(*TO_M.transform(c[0], c[1]))
    return out, s


def gazetteer():
    g = load(os.path.join(BT, 'app', 'data', 'gazetteer.json'))
    out = {}
    for p in g['places']:
        c = p['center']
        out[p['name']] = Point(*TO_M.transform(c['lng'], c['lat']))
    return out


def read_layer(name):
    d = load(os.path.join(LC, name + '.geojson'))
    out = []
    for f in d['features']:
        g = to_m(shape(f['geometry']))
        if not g.is_valid:
            g = g.buffer(0)
        out.append((f['properties'], g))
    return out


# ---------------------------------------------------------------------------------------------------------------- geometry
ROAD_HALF = {'turnpike': 7.0, 'county road': 5.2, 'township road': 4.6, 'lane (neighbourhood lane)': 3.6, 'lane or township road': 4.0}


def barrier_lines(S):
    """roads, lanes, railway and the confirmed fence lines, as (geometry, class) in metres"""
    roads = load(os.path.join(RRW, 'roads.geojson'))['features'] + load(os.path.join(RRW, 'lanes.geojson'))['features']
    rail = load(os.path.join(RRW, 'railways.geojson'))['features']
    out, corridor = [], []
    for f in roads:
        sub = f['properties'].get('subtype') or ''
        if sub == 'town square' or f['geometry']['type'] != 'LineString':
            continue
        g = to_m(shape(f['geometry']))
        corridor.append(g.buffer(ROAD_HALF.get(sub, 4.0), cap_style=2))
    for f in rail:
        if f['geometry']['type'] in ('LineString', 'MultiLineString'):
            corridor.append(to_m(shape(f['geometry'])).buffer(5.0, cap_style=2))
    fences = []
    for fn in S['fences']:
        fences.append(to_m(LineString(fn['coords'])))
    return unary_union(corridor), fences


def voronoi_cells(poly, k, seed):
    """k seeded points inside poly, relaxed a few times, cells clipped to poly (list of polygons)"""
    rng = random.Random(seed)
    minx, miny, maxx, maxy = poly.bounds
    pts = []
    tries = 0
    while len(pts) < k and tries < k * 400:
        tries += 1
        p = Point(rng.uniform(minx, maxx), rng.uniform(miny, maxy))
        if poly.contains(p):
            pts.append(p)
    if len(pts) < 2:
        return [poly]
    for _ in range(7):
        v = shapely.voronoi_polygons(shapely.MultiPoint(pts), extend_to=poly.envelope.buffer(50))
        cells = [c.intersection(poly) for c in v.geoms]
        newp = []
        for p in pts:
            cs = [c for c in cells if not c.is_empty and c.buffer(0.01).contains(p)]
            if cs:
                big = max(polys(cs[0]), key=lambda q: q.area)
                cp = big.representative_point() if not big.contains(big.centroid) else big.centroid
                newp.append(cp)
            else:
                newp.append(p)
        pts = newp
    v = shapely.voronoi_polygons(shapely.MultiPoint(pts), extend_to=poly.envelope.buffer(50))
    out = []
    for c in v.geoms:
        for q in polys(c.intersection(poly)):
            out.append(q)
    return out


def merge_slivers(cells, min_area):
    """a piece smaller than min_area joins the neighbour it shares the longest edge with (or is dropped when it touches none)"""
    cells = list(cells)
    changed = True
    while changed:
        changed = False
        cells.sort(key=lambda c: c.area)
        for i, c in enumerate(cells):
            if c.area >= min_area:
                break
            best, bl = None, 0.0
            for j, d in enumerate(cells):
                if i == j:
                    continue
                sh = c.buffer(0.5).intersection(d.boundary).length
                if sh > bl:
                    best, bl = j, sh
            if best is not None and bl > 3.0:
                cells[best] = unary_union([cells[best], c]).buffer(0.2).buffer(-0.2)
                cells.pop(i)
                changed = True
                break
            elif bl <= 3.0 and c.area < min_area * 0.5:
                cells.pop(i)
                changed = True
                break
    out = []
    for c in cells:
        out += [p for p in polys(c) if p.area >= min_area * 0.6]
    return out


def orient_deg(poly):
    """long-axis bearing (degrees from north, clockwise, 0-180) of the minimum rotated rectangle: the way a field's rows and an orchard's rows run"""
    r = poly.minimum_rotated_rectangle
    cs = list(r.exterior.coords)
    e = [((cs[i + 1][0] - cs[i][0]), (cs[i + 1][1] - cs[i][1])) for i in range(2)]
    dx, dy = max(e, key=lambda t: math.hypot(*t))
    return (math.degrees(math.atan2(dx, dy)) + 360) % 180


def build_units(args):
    terr, G = ground_box()
    farms, S = farm_anchors()
    gz = gazetteer()
    layers = {n: read_layer(n) for n in ('woods_1863', 'orchards_1863', 'scattered_trees_1863', 'marsh_wetland_1863', 'boulder_fields_1863', 'open_cleared_1863', 'fields_documented_1863', 'open_ground_1863', 'excluded_town_zone')}
    corridor, fences = barrier_lines(S)
    units = []

    def add(cls, props, g, **kw):
        for k, p in enumerate(polys(g.intersection(G))):
            if p.area < 40:
                continue
            u = {'cls': cls, 'lc': props['id'] + ('' if k == 0 else '#%d' % k), 'lc_name': props.get('name') or None, 'lc_conf': props.get('confidence'), 'geom': p}
            u.update(kw)
            units.append(u)

    claimed = []
    for nm, cls in (('woods_1863', 'woods'), ('orchards_1863', 'orchard'), ('scattered_trees_1863', 'scatter'), ('marsh_wetland_1863', 'marsh'), ('boulder_fields_1863', 'boulder'), ('open_cleared_1863', 'cleared'), ('fields_documented_1863', 'wheatfield')):
        for pr, g in layers[nm]:
            add(cls, pr, g)
            claimed.append(g)
    town = unary_union([g for _, g in layers['excluded_town_zone']])
    covered = unary_union(claimed + [town]).buffer(0)
    # the open remainder: open ground not covered by anything else, with the road, lane and railway corridors cut out
    openg = unary_union([g for _, g in layers['open_ground_1863']]).intersection(G).difference(covered).difference(corridor)
    pieces = []
    for p in polys(openg):
        if p.area > 400:
            # split by the confirmed fence lines (thin cuts): a fence line that crosses the piece divides it
            cut = unary_union([f.buffer(0.6) for f in fences if f.intersects(p)])
            parts = polys(p.difference(cut)) if not cut.is_empty else [p]
            for q in parts:
                if q.area > 400:
                    pieces.append(q)
    cells = []
    for bi, p in enumerate(sorted(pieces, key=lambda q: (round(q.centroid.x), round(q.centroid.y)))):
        ac = p.area / ACRE
        if ac > 28.0:
            k = max(2, int(round(ac / 14.0)))
            sub = voronoi_cells(p, k, 1863 + bi)
            sub = merge_slivers(sub, 0.9 * ACRE)
            cells += [(bi, c, True) for c in sub]
        else:
            cells.append((bi, p, False))
    for bi, c, sub in cells:
        if c.area < 0.5 * ACRE:
            continue
        units.append({'cls': 'field', 'lc': 'OPEN-B%03d' % bi, 'lc_name': None, 'lc_conf': 'Estimated', 'geom': c.simplify(1.0), 'subdivided': sub, 'block': bi})
    return units, terr, G, farms, gz, S


# ---------------------------------------------------------------------------------------------------------------- time
MONTH0 = {6: 0, 7: 30, 8: 61, 9: 92, 10: 122, 11: 153}


def iso_min(s):
    """'1863-07-02' or '1863-07-02T16:30' -> minutes since 1863-06-01 00:00 (the clock of the theatre)"""
    d, _, t = s.partition('T')
    y, m, dd = (int(x) for x in d.split('-'))
    assert y == 1863 and m in MONTH0, s
    hh, mm = (int(x) for x in t.split(':')) if t else (0, 0)
    return ((MONTH0[m] + dd - 1) * 24 + hh) * 60 + mm


# ---------------------------------------------------------------------------------------------------------------- claims, anchors
sys.path.insert(0, HERE)
import veg_tables as TB  # noqa: E402

# anchors and structured readings for generated NPS claims and the hand claims that need one (claim id -> dict). An anchor is a RULE for where to look, never a coordinate
# taken from a map: bearing (degrees clockwise from north) and dist_m from a named farmstead or gazetteer place, r_m the search radius, class the kind of unit, k how many units.
ANCHOR_OVERRIDES = {
    'VC-NPSX-CLI-PCB-p082-01': ({'gz': 'Cemetery Hill', 'bearing': 270, 'dist_m': 900, 'r_m': 380, 'class': 'field', 'k': 1}, {'crop': 'corn', 'stage': 'immature', 'tier_why': 'the Russell field lay on the east slope of Seminary Ridge nearly opposite Cemetery Hill'}),
    'VC-NPSX-CLI-PCB-p078-01': ({'gz': 'Cemetery Hill', 'bearing': 285, 'dist_m': 1050, 'r_m': 380, 'class': 'field', 'k': 1}, {'crop': 'corn', 'tier_why': 'the Barrett field lay on the east slope of Seminary Ridge'}),
    'VC-NPSX-CLI-PCB-p079-04': ({'gz': 'Cemetery Hill', 'bearing': 255, 'dist_m': 1000, 'r_m': 380, 'class': 'field', 'k': 1}, {'crop': 'corn', 'tier_why': 'the Culp field lay beside Seminary Ridge and Long Lane; the NPS record says Culp\'s fence was torn from "his corn field" (VC-NPS... not cited: the corn is named in the record of treatment p.178)', 'crop_by_other': True}),
    'VC-NPSX-CLI-PCB-p072-02': ({'farm': 'mcmillan', 'r_m': 380, 'class': 'field', 'k': 1}, {'crop': 'corn'}),
    'VC-NPSX-CLI-PCB-p081-04': ({'farm': 'rogers', 'r_m': 300, 'class': 'field', 'k': 1}, {'crop': 'hay', 'landcover': 'meadow', 'garden': True}),
    'VC-NPSX-CLI-PCB-p085-02': ({'farm': 'wentz', 'r_m': 320, 'class': 'field', 'k': 1}, {'crop_class': 'arable'}),
    'VC-NPSX-CLI-PCB-p083-04': ({'farm': 'h_spangler', 'r_m': 520, 'class': 'field', 'area': True}, {'crop_class': 'arable_or_hay'}),
    'VC-NPSX-CLI-PCB-p080-03': ({'farm': 'mcmillan', 'r_m': 500, 'class': 'woods', 'k': 1}, {'canopy': 'deciduous'}),
    'VC-NPSX-CLI-PCB-p081-02': ({'gz': "Pitzer's Woods", 'r_m': 220, 'class': 'woods', 'k': 1}, {'canopy': 'deciduous'}),
    'VC-NPSX-CLI-PCB-p084-02': ({'farm': 'h_spangler', 'r_m': 520, 'class': 'woods', 'k': 1}, {'canopy': 'deciduous'}),
    'VC-NPSX-CLI-PCB-p084-04': ({'gz': 'Oak Ridge', 'r_m': 700, 'class': 'woods', 'k': 1}, {'canopy': 'oak'}),
    'VC-NPSX-CLI-1STDAY-p077-01': ({'poly': 'LC-WOOD-0010'}, {'understory': 'open_lost_since'}),
    'VC-NPSX-CLR-1STDAY-p067-04': ({'poly': 'LC-WOOD-0010'}, {'damage': 'trunks_damaged_most_standing'}),
    'VC-NPSX-CLI-ERR-p095-01': ({'farm': 'codori', 'bearing': 100, 'dist_m': 380, 'r_m': 260, 'class': 'woods', 'k': 1}, {'canopy': 'grove'}),
    'VC-NPSX-CLI-ERR-p095-02': ({'farm': 'codori', 'bearing': 90, 'dist_m': 140, 'r_m': 260, 'class': 'orchard', 'k': 1}, {'orchard': 'large'}),
    'VC-NPSX-CLI-ERR-p095-04': ({'farm': 'klingel', 'r_m': 480, 'class': 'orchard', 'area': True}, {'species': ['apple', 'cherry', 'pear', 'peach']}),
    'VC-NPSX-CLI-ERR-p095-06': ({'farm': 'trostle', 'r_m': 480, 'class': 'orchard', 'area': True}, {'species': ['apple', 'cherry']}),
    'VC-NPSX-CLI-ERR-p095-07': ({'farm': 'trostle', 'bearing': 180, 'dist_m': 120, 'r_m': 300, 'class': 'orchard', 'k': 1}, {'age': 'young'}),
    'VC-NPSX-CLI-PCB-p082-04': ({'farm': 'sherfy', 'r_m': 520, 'class': 'orchard', 'area': True}, {'age': 'young_and_declining'}),
    'VC-NPSX-CLI-PCB-p051-03': ({'farm': 'bliss', 'r_m': 420, 'class': 'orchard', 'k': 1}, {'orchard': 'cover_for_skirmishers'}),
}
KIND_FIX = {'VC-NPSX-CLI-PCB-p081-04': 'crop', 'VC-NPSX-CLI-PCB-p085-02': 'crop', 'VC-NPSX-CLI-PCB-p080-03': 'woodlot', 'VC-NPSX-CLI-PCB-p081-02': 'woodlot', 'VC-NPSX-CLI-PCB-p084-04': 'woodlot', 'VC-NPSX-CLI-PCB-p084-02': 'woodlot'}
CLASS_MAP = {'field': ('field',), 'woods': ('woods', 'scatter'), 'orchard': ('orchard',), 'any': ('field', 'woods', 'scatter', 'orchard', 'marsh', 'cleared', 'wheatfield', 'boulder')}


def load_claims():
    cl = load(CLAIMS)
    out = {}
    for c in cl:
        if c['id'] in ANCHOR_OVERRIDES:
            a, ab = ANCHOR_OVERRIDES[c['id']]
            c['anchor'] = a
            c['about'] = dict(c.get('about') or {}, **ab)
        if c['id'] in KIND_FIX:
            c['kind'] = KIND_FIX[c['id']]
        out[c['id']] = c
    return out


def anchor_point(a, farms, gz):
    if 'farm' in a:
        base = farms[a['farm']]
    elif 'gz' in a:
        base = gz[a['gz']]
    elif 'lnglat' in a:
        base = Point(*TO_M.transform(*a['lnglat']))
    else:
        return None
    if 'bearing' in a:
        b = math.radians(a['bearing'])
        return Point(base.x + a['dist_m'] * math.sin(b), base.y + a['dist_m'] * math.cos(b))
    return base


def attach_claims(units, claims, farms, gz):
    """role per (unit, claim): exact (the claim names the polygon), nearest (the unit nearest the anchor in the class), area (any unit of the class within r_m)"""
    taken = set()
    by_lc = {u['lc']: u for u in units}
    for u in units:
        u['claims'] = []
    unplaced = []
    for cid in sorted(claims):
        c = claims[cid]
        a = c.get('anchor')
        if not a:
            unplaced.append(cid)
            continue
        if 'poly' in a and not a.get('class'):
            u = by_lc.get(a['poly'])
            if u is None:
                unplaced.append(cid)       # the polygon lies outside the loaded ground
                continue
            u['claims'].append([cid, 'exact'])
            continue
        if 'poly' in a:
            base = by_lc.get(a['poly'])
            if base is None:
                unplaced.append(cid)
                continue
            pt = base['geom'].centroid
        else:
            pt = anchor_point(a, farms, gz)
        if pt is None:
            unplaced.append(cid)
            continue
        cls = CLASS_MAP.get(a.get('class') or 'any')
        r = a.get('r_m', 300)
        cands = sorted(((u['geom'].distance(pt), u) for u in units if u['cls'] in cls and not (a.get('exclude_self') and 'poly' in a and u['lc'] == a['poly'])), key=lambda t: t[0])
        cands = [(d, u) for d, u in cands if d <= r]
        if not cands:
            unplaced.append(cid)
            continue
        k = a.get('k', 1)
        if a.get('area'):
            for d, u in cands:
                u['claims'].append([cid, 'area'])
        else:
            given = 0
            for d, u in cands:
                if given < k and (cid not in taken) and not (c.get('about', {}).get('crop') and u.get('crop_claim_taken')):
                    u['claims'].append([cid, 'nearest'])
                    if c.get('about', {}).get('crop') or c.get('about', {}).get('crop_class'):
                        u['crop_claim_taken'] = cid
                    given += 1
                else:
                    u['claims'].append([cid, 'area'])
            if given == 0:
                u = cands[0][1]
                u['claims'].append([cid, 'nearest'])
    return unplaced


# ---------------------------------------------------------------------------------------------------------------- the district mix of crops
def district_mix(claims):
    """shares of the arable and hay acreage from the farm inventories read in the claims (acres, ranges by midpoint)"""
    tot = collections.Counter()
    farms = []
    for c in claims.values():
        if c['kind'] != 'farm_inventory' or not (c.get('about') or {}).get('crops'):
            continue
        row = {}
        for crop, ac in c['about']['crops'].items():
            if ac is None:
                continue
            v = sum(ac) / 2 if isinstance(ac, list) else float(ac)
            g = {'grass': 'hay', 'hay_timothy': 'hay', 'potatoes': None, 'flax': None}.get(crop, crop)
            if g and v >= 1.0:
                tot[g] += v
                row[g] = row.get(g, 0) + v
        farms.append({'farm': c['about']['farm'], 'claim': c['id'], 'acres': row})
    s = sum(tot.values())
    mix = {k: v / s for k, v in tot.items()}
    for k, f in TB.MIX_FLOOR.items():
        if mix.get(k, 0) < f:
            mix[k] = f
    z = sum(mix.values())
    mix = {k: round(v / z, 4) for k, v in sorted(mix.items())}
    return mix, farms, dict(tot)


def draw_crop(rng_u, mix, neighbours, arable_only=False, hay_ok=True):
    w = {}
    for k, v in mix.items():
        if arable_only and k in ('pasture', 'hay'):
            continue
        if not hay_ok and k == 'hay':
            continue
        n = sum(1 for x in neighbours if x == k)
        w[k] = v * (0.45 ** n)
    tot = sum(w.values())
    x = rng_u * tot
    for k in sorted(w):
        x -= w[k]
        if x <= 0:
            return k
    return sorted(w)[-1]


# ---------------------------------------------------------------------------------------------------------------- attributes
def woods_class(u, gz, farms):
    c = u['geom'].centroid
    if u['lc'] == 'LC-WOOD-0002':
        return 'big_round_top'
    if u['lc'] == 'LC-WOOD-0001':
        return 'ridge_forest'
    ll = TO_LL.transform(c.x, c.y)
    if ll[1] >= 39.8265:
        return 'first_day_woodlot'
    for name in ("Devil's Den", 'Little Round Top', "Houck's Ridge", "Culp's Hill", "Powers' Hill", 'Big Round Top'):
        if name in gz and gz[name].distance(c) < 1100:
            return 'ridge_forest'
    return 'farm_woodlot'


def pick(rng, rng_key, lo_hi):
    return lo_hi[0] + (lo_hi[1] - lo_hi[0]) * rnd(*rng_key)


def cell_attributes(u, mix, claims, units_by_lc):
    uid = u['id']
    seed = int(rnd(uid, 'seed') * 2 ** 31)
    u['seed'] = seed
    p = {'ripe_off_d': round(-2.5 + 5.0 * rnd(uid, 'ripe'), 2), 'h_scale': round(0.92 + 0.16 * rnd(uid, 'h'), 3), 'color_u': round(rnd(uid, 'col'), 3), 'epi_u': round(rnd(uid, 'epi'), 3),
         'cut_u': round(rnd(uid, 'cut'), 4), 'rows_deg': round(orient_deg(u['geom']), 1)}
    u['p'] = p


def build_json(args):
    units, terr, G, farms, gz, S = build_units(args)
    claims = load_claims()
    for c in claims.values():
        if 'about' not in c:
            c['about'] = {}
    # a stable order and stable ids
    order = {'wheatfield': 0, 'field': 1, 'cleared': 2, 'marsh': 3, 'boulder': 4, 'orchard': 5, 'scatter': 6, 'woods': 7}
    units.sort(key=lambda u: (order[u['cls']], u['lc'], round(u['geom'].centroid.x), round(u['geom'].centroid.y)))
    for i, u in enumerate(units):
        u['id'] = 'V-%04d' % (i + 1)
    units_by_lc = {u['lc']: u for u in units}
    unplaced = attach_claims(units, claims, farms, gz)
    mix, farm_rows, acres = district_mix(claims)

    # ----- crops of the field cells
    fields = [u for u in units if u['cls'] in ('field', 'wheatfield')]
    for u in units:
        cell_attributes(u, mix, claims, units_by_lc)
    placed_crop = {}
    for u in fields:
        # claims first: exact > nearest
        got = None
        for cid, role in sorted(u['claims'], key=lambda t: (0 if t[1] == 'exact' else 1, t[0])):
            if role == 'area':
                continue
            ab = claims[cid].get('about') or {}
            if ab.get('crop') and ab['crop'] in TB.CROPS:
                got = (ab['crop'], 'documented' if role == 'exact' else 'inferred', cid, role)
                break
            if ab.get('crop_class'):
                arable = ab['crop_class'] in ('arable', 'arable_or_hay')
                crop = draw_crop(rnd(u['id'], 'cc'), mix, [], arable_only=ab['crop_class'] == 'arable')
                got = (crop, 'inferred', cid, role)
                break
        if u['cls'] == 'wheatfield':
            got = ('wheat', 'documented', 'VC-LIB-007', 'exact')
        if got:
            u['crop'], u['crop_tier'], u['crop_claim'], u['crop_role'] = got
            u['crop_basis'] = 'claim'
        placed_crop[u['id']] = got
    # the rest: seeded draw with repulsion from the neighbours already drawn
    index = {u['id']: u for u in fields}
    nb = {}
    geoms = {u['id']: u['geom'] for u in fields}
    for u in fields:
        nb[u['id']] = [v['id'] for v in fields if v is not u and u['geom'].distance(v['geom']) < 12.0]
    for u in sorted(fields, key=lambda u: rnd(u['id'], 'ord')):
        if 'crop' in u:
            continue
        neigh = [index[n].get('crop') for n in nb[u['id']] if index[n].get('crop')]
        u['crop'] = draw_crop(rnd(u['id'], 'crop'), mix, neigh)
        u['crop_tier'] = 'plausible-procedural'
        u['crop_basis'] = 'district_mix'
    return units, claims, unplaced, mix, farm_rows, acres, terr, G, farms, gz, S


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    units, claims, unplaced, mix, farm_rows, acres, terr, G, farms, gz, S = build_json(a)
    print('units', len(units), collections.Counter(u['cls'] for u in units))
    print('mix', mix, 'acres', {k: round(v) for k, v in acres.items()})
    print('crops of field cells', collections.Counter(u.get('crop') for u in units if u['cls'] in ('field', 'wheatfield')))
    print('crop basis', collections.Counter((u.get('crop_basis'), u.get('crop_tier')) for u in units if u['cls'] in ('field', 'wheatfield')))
    print('claims', len(claims), 'unplaced', len(unplaced), 'placed', len(claims) - len(unplaced))
    roles = collections.Counter(r for u in units for _, r in u['claims'])
    print('roles', roles)
