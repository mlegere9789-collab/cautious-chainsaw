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
FARM_CONSTRAINTS = {   # farm key -> [(crop, claim id)]: fields the inventory names on a farm whose own fields cannot be placed one by one
    'mcpherson': [('corn', 'VC-NPSX-CLI-1STDAY-p058-10'), ('wheat', 'VC-NPSX-CLI-1STDAY-p059-01'), ('hay', 'VC-NPSX-CLI-1STDAY-p058-07')],
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
    if u['cls'] == 'wheatfield':
        p['ripe_off_d'] = 0.0          # the stage on 1-3 July is documented: no offset
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
    # farm inventories that name fields but cannot place them: the crops exist on the farm; WHICH cell holds each is a seeded choice among the cells nearest the farmstead
    for farm, rows in FARM_CONSTRAINTS.items():
        pt = farms[farm]
        pool = sorted((u for u in fields if 'crop' not in u and u['cls'] == 'field'), key=lambda u: u['geom'].distance(pt))
        pool = [u for u in pool if u['geom'].distance(pt) < 750][:8]
        order = sorted(pool, key=lambda u: rnd(u['id'], farm, 'fc'))
        for (crop, cid), u in zip(rows, order):
            u['crop'], u['crop_tier'], u['crop_basis'], u['crop_claim'], u['crop_role'] = crop, 'plausible-procedural', 'farm_inventory', cid, 'farm'
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


# ---------------------------------------------------------------------------------------------------------------- class attributes
def jitter_weights(uid, w, tag):
    out = {}
    for k in sorted(w):
        out[k] = w[k] * (0.6 + 0.8 * rnd(uid, tag, k))
    z = sum(out.values())
    return {k: round(v / z, 3) for k, v in out.items()}


def class_attributes(units, claims, gz, farms):
    lrt = gz.get('Little Round Top')
    lrt_units = []
    for u in units:
        uid = u['id']
        cl = {cid: role for cid, role in u['claims']}
        young = any((claims[c].get('about') or {}).get('age') in ('young', 'young_and_declining') and r in ('nearest', 'exact') for c, r in cl.items())
        if u['cls'] == 'woods':
            k = woods_class(u, gz, farms)
            W = TB.WOODS[k]
            u['woods'] = {'class': k, 'species': jitter_weights(uid, W['species'], 'sp'), 'per_ha': round(pick(None, (uid, 'dens'), W['per_ha']), 1), 'understory': W['understory'], 'tier': W['tier']}
            if lrt is not None and u['geom'].centroid.distance(lrt) < 520:
                lrt_units.append(uid)
        elif u['cls'] == 'scatter':
            W = TB.WOODS['scatter']
            u['woods'] = {'class': 'scatter', 'species': jitter_weights(uid, W['species'], 'sp'), 'per_ha': round(pick(None, (uid, 'dens'), W['per_ha']), 1), 'understory': 'none', 'tier': W['tier']}
            if lrt is not None and u['geom'].centroid.distance(lrt) < 520:
                lrt_units.append(uid)
        elif u['cls'] == 'orchard':
            k = 'peach_orchard' if u['lc'] == 'LC-ORCH-0206' else ('young' if young else 'mature')
            O = TB.ORCHARD[k]
            u['orchard'] = {'class': k, 'spacing_m': round(pick(None, (uid, 'sp'), O['spacing_m']), 2), 'species': jitter_weights(uid, O['species'], 'osp'), 'age_tier': 'documented' if (young and k == 'young') or k == 'peach_orchard' else 'plausible-procedural', 'tier': O['tier']}
        elif u['cls'] == 'marsh':
            u['crop'], u['crop_tier'], u['crop_basis'] = 'marsh', 'inferred', 'claim' if u['lc'] == 'LC-WET-0001' else 'warren_symbol'
            if u['lc'] == 'LC-WET-0001':
                W = TB.WOODS['thicket']
                u['woods'] = {'class': 'thicket', 'species': dict(W['species']), 'per_ha': round(pick(None, (uid, 'dens'), W['per_ha']) * 0.55, 1), 'understory': 'thick', 'tier': W['tier']}
        elif u['cls'] == 'cleared':
            u['crop'], u['crop_tier'], u['crop_basis'] = 'open_rock', 'inferred', 'claim'
        elif u['cls'] == 'boulder':
            u['rock'] = 'boulder field of the Warren sheet (Devil\'s Den and Houck\'s Ridge): bare rock with sparse grass, no crop'
    return lrt_units


# ---------------------------------------------------------------------------------------------------------------- events
def region_geom(r, farms, gz):
    if 'disc' in r:
        d = r['disc']
        pt = anchor_point(d, farms, gz)
        return pt.buffer(d['r_m'])
    if 'corridor' in r:
        a = anchor_point(r['corridor']['a'], farms, gz)
        b = anchor_point(r['corridor']['b'], farms, gz)
        return LineString([a, b]).buffer(r['corridor']['w_m'] / 2.0, cap_style=2)
    raise ValueError(r)


EVENTS = [
    {'id': 'EV-VEG-01', 'kind': 'trample', 'label': 'The Wheatfield fought through, 2 July', 'unit_lc': 'LC-FIELD-0001', 'from': '1863-07-02T16:30', 'to': '1863-07-02T19:30', 'final': [0.7, 0.95], 'tier': 'documented', 'magnitude_tier': 'plausible-procedural',
     'claims': ['VC-OR-001', 'VC-OR-003', 'VC-OR-004', 'VC-OR-005', 'VC-OR-022', 'VC-LIB-006', 'VC-LIB-018'], 'basis': 'Cross, Kelly, Zook, Brooke and Sweitzer advanced through the wheat-field and Brooke fell back across it; the Southern brigades attacked into it (the OR reports quoted); the window is the span of the engagement rows EN-014 to EN-021 of the theatre clock (16:30 to 19:30); the share trampled is a range'},
    {'id': 'EV-VEG-02', 'kind': 'trample', 'label': 'The fields of the Trostle farm, 2 July', 'region': {'disc': {'farm': 'trostle', 'r_m': 450}}, 'from': '1863-07-02T17:00', 'to': '1863-07-02T20:00', 'final': [0.35, 0.8], 'tier': 'inferred', 'magnitude_tier': 'plausible-procedural',
     'claims': ['VC-WEB-002', 'VC-WEB-003', 'VC-LIB-006'], 'basis': 'the petition says the farm lay between the armies, was fought over two days and its crops were totally destroyed; the disc of 450 m around the farmstead is the reach assumed'},
    {'id': 'EV-VEG-03', 'kind': 'trample', 'label': 'The Peach Orchard and the Emmitsburg Road fields, 2 July', 'region': {'disc': {'farm': 'sherfy', 'r_m': 520}}, 'from': '1863-07-02T15:30', 'to': '1863-07-02T19:00', 'final': [0.3, 0.75], 'tier': 'inferred', 'magnitude_tier': 'plausible-procedural',
     'claims': ['VC-LIB-006', 'VC-LIB-018', 'VC-OR-015'], 'basis': 'Haskell: the fields in front of the Second and Third Corps were trampled by the evening of 2 July (the corps front ran from the Peach Orchard to Cemetery Ridge); the oat-field by the Peach Orchard was fought in'},
    {'id': 'EV-VEG-04', 'kind': 'trample', 'label': 'The Codori and Klingel fields, 2 July evening', 'region': {'disc': {'farm': 'codori', 'r_m': 420}}, 'from': '1863-07-02T18:30', 'to': '1863-07-02T20:00', 'final': [0.25, 0.7], 'tier': 'inferred', 'magnitude_tier': 'plausible-procedural',
     'claims': ['VC-LIB-006', 'VC-LIB-018'], 'basis': 'engagement row EN-018 (Emmitsburg Road and the Codori farm, 18:30 to 19:00); the reach is assumed'},
    {'id': 'EV-VEG-05', 'kind': 'trample', 'label': 'The advance of 3 July over the fields west of the Emmitsburg Road', 'region': {'corridor': {'a': {'farm': 'h_spangler', 'bearing': 270, 'dist_m': 350}, 'b': {'gz': 'The Angle'}, 'w_m': 760}}, 'from': '1863-07-03T15:00', 'to': '1863-07-03T16:30', 'final': [0.2, 0.65], 'tier': 'inferred', 'magnitude_tier': 'plausible-procedural',
     'claims': ['VC-LIB-020', 'VC-NPSX-CLI-PCB-p078-02', 'VC-NPSX-CLI-PCB-p078-03'], 'basis': 'the divisions crossed the open fields between Seminary Ridge and the Angle, "through orchard and meadow, and cornfield" (Haskell); engagement rows EN-030 and EN-031 (15:30 to 16:15) fix the hour; the corridor is a straight band between the two ends and is not a measured track'},
    {'id': 'EV-VEG-06', 'kind': 'trample', 'label': 'The fields of the McPherson and Forney farms, 1 July', 'region': {'disc': {'farm': 'mcpherson', 'r_m': 520}}, 'from': '1863-07-01T10:00', 'to': '1863-07-01T16:30', 'final': [0.2, 0.6], 'tier': 'inferred', 'magnitude_tier': 'plausible-procedural',
     'claims': ['VC-NPS-031', 'VC-NPSX-CLR-1STDAY-p065-01'], 'basis': 'the McPherson tenant lost 9 acres of wheat, 16 of corn and 18 of grass; "the fields trodden down like a highway" (Jacobs, quoted by the NPS); the engagement rows of 1 July fix the hours'},
    {'id': 'EV-VEG-07', 'kind': 'strip', 'label': 'Culp\'s Hill: trees stripped and scarred, 2 and 3 July', 'region': {'disc': {'gz': "Culp's Hill", 'r_m': 520}}, 'from': '1863-07-02T19:00', 'to': '1863-07-03T11:00', 'final': [0.18, 0.45], 'tier': 'documented', 'magnitude_tier': 'plausible-procedural',
     'claims': ['VC-LIB-019', 'VC-NPS-040', 'VC-NPS-041'], 'basis': 'gigantic trees stripped of leaves and branches and trunks scarred by the musketry (Bachelder); bullet-ridden trees died after the battle (NPS); fighting windows EN-019, EN-022 to EN-024, EN-027 and the OR reports; the share stripped is a range'},
    {'id': 'EV-VEG-08', 'kind': 'strip', 'label': 'Herbst Woods, 1 July', 'region': {'disc': {'gz': 'Herbst Woods', 'r_m': 320}}, 'from': '1863-07-01T10:00', 'to': '1863-07-01T16:00', 'final': [0.02, 0.1], 'tier': 'documented', 'magnitude_tier': 'plausible-procedural',
     'claims': ['VC-NPSX-CLR-1STDAY-p067-04'], 'basis': 'tree trunks were damaged by shell and shot but most trees remained standing with relatively little damage (NPS)'},
    {'id': 'EV-VEG-09', 'kind': 'strip', 'label': 'The orchards of the Second and Third Corps front, 2 July', 'region': {'disc': {'farm': 'sherfy', 'r_m': 520}}, 'from': '1863-07-02T15:30', 'to': '1863-07-02T19:00', 'final': [0.2, 0.5], 'tier': 'inferred', 'magnitude_tier': 'plausible-procedural',
     'claims': ['VC-LIB-018'], 'basis': 'the orchards splintered (Haskell, the evening of 2 July); the disc is the Peach Orchard and the orchards around it'},
    {'id': 'EV-VEG-10', 'kind': 'strip', 'label': 'The Klingel and Trostle orchards, 2 July', 'region': {'disc': {'farm': 'klingel', 'r_m': 420}}, 'from': '1863-07-02T17:30', 'to': '1863-07-02T19:30', 'final': [0.15, 0.4], 'tier': 'inferred', 'magnitude_tier': 'plausible-procedural',
     'claims': ['VC-LIB-018', 'VC-NPS-025'], 'basis': 'the orchards splintered; a general reported them as thick orchards on 2 July'},
]


def build_events(units, farms, gz, claims):
    out = []
    for e in EVENTS:
        d = {k: v for k, v in e.items() if k not in ('region', 'unit_lc', 'from', 'to')}
        d['from_min'], d['to_min'] = iso_min(e['from']), iso_min(e['to'])
        d['from'], d['to'] = e['from'], e['to']
        for cid in e['claims']:
            assert cid in claims, (e['id'], cid)
        hit = []
        if 'unit_lc' in e:
            for u in units:
                if u['lc'] == e['unit_lc']:
                    u.setdefault('ev', []).append([e['id'], 1.0])
                    hit.append(u['id'])
        else:
            reg = region_geom(e['region'], farms, gz)
            d['region_ll'] = [round(x, 5) for xy in list(to_ll(reg).exterior.coords)[:-1] for x in xy] if reg.geom_type == 'Polygon' else None
            want = ('field', 'wheatfield', 'cleared', 'orchard') if e['kind'] == 'trample' else ('woods', 'orchard', 'scatter')
            for u in units:
                if u['cls'] not in want:
                    continue
                inter = u['geom'].intersection(reg).area
                cov = inter / u['geom'].area
                if cov >= 0.05:
                    u.setdefault('ev', []).append([e['id'], round(cov, 3)])
                    hit.append(u['id'])
        d['units'] = hit
        out.append(d)
    return out


# ---------------------------------------------------------------------------------------------------------------- witness trees
def nearest_on(lines, pt):
    best = None
    for ln in lines:
        d = ln.distance(pt)
        if best is None or d < best[0]:
            best = (d, ln, ln.interpolate(ln.project(pt)))
    return best


def witness_trees(farms, gz):
    roads = load(os.path.join(RRW, 'roads.geojson'))['features']
    lanes = load(os.path.join(RRW, 'lanes.geojson'))['features']
    out = []
    # the large oak just south of Trostle Lane (VC-NPSX-CLI-ERR-p095-08)
    tl = [to_m(shape(f['geometry'])) for f in lanes if f['properties']['id'].startswith('LN-001')]
    if tl:
        d, ln, p = nearest_on(tl, farms['trostle'])
        pt = Point(p.x, p.y - 9.0)
        out.append({'id': 'WT-01', 'name': 'Large oak south of the Trostle lane (Sickles and his staff, 2 July)', 'species': 'oak', 'h_m': [20, 26], 'r_m': [8, 10], 'lnglat': [round(v, 6) for v in TO_LL.transform(pt.x, pt.y)], 'pos_err_m': 60, 'pos_tier': 'inferred', 'claims': ['VC-NPSX-CLI-ERR-p095-08'],
                    'basis': 'the point of the lane nearest the Trostle farmstead, 9 m to the south; the lane line is the repository\'s (Warren), the farmstead the 2023 outline of the surviving house: the tree stood somewhere along the lane, which the claim does not fix'})
    # the large tree at the junction of the Codori farm lane and the Emmitsburg Road (VC-NPSX-CLI-ERR-p095-03)
    cl = [to_m(shape(f['geometry'])) for f in lanes if f['properties']['id'] in ('LN-004',)]
    er = [to_m(shape(f['geometry'])) for f in roads if f['properties']['id'] == 'RD-003']
    if cl and er:
        j = cl[0].intersection(er[0])
        if j.is_empty:
            j = nearest_on(er, cl[0].centroid)[2]
        if j.geom_type != 'Point':
            j = j.centroid
        pt = Point(j.x - 6.0, j.y + 4.0)
        out.append({'id': 'WT-02', 'name': 'Large tree at the Codori lane and the Emmitsburg Road (Confederate sharpshooter, 3 July)', 'species': 'oak', 'h_m': [16, 22], 'r_m': [6, 9], 'lnglat': [round(v, 6) for v in TO_LL.transform(pt.x, pt.y)], 'pos_err_m': 50, 'pos_tier': 'inferred', 'claims': ['VC-NPSX-CLI-ERR-p095-03'],
                    'basis': 'the junction of the lane line (LN-004) and the Emmitsburg Road line (RD-003) of the repository; the claim says only "near the junction"; the species is not stated and the oak is a plain assumption'})
    return out


# ---------------------------------------------------------------------------------------------------------------- output
def ll_ring(poly, nd=5):
    g = to_ll(poly)
    return ring_flat(g.exterior, nd)


def make_output(args):
    units, claims, unplaced, mix, farm_rows, acres, terr, G, farms, gz, S = build_json(args)
    lrt_units = class_attributes(units, claims, gz, farms)
    events = build_events(units, farms, gz, claims)
    wts = witness_trees(farms, gz)
    # farm record
    farm_out = []
    inv = collections.defaultdict(list)
    for c in claims.values():
        if c['kind'] == 'farm_inventory':
            inv[(c.get('about') or {}).get('farm')].append(c['id'])
    for k, name in sorted(FARMS.items()):
        pt = farms[k]
        ll = TO_LL.transform(pt.x, pt.y)
        farm_out.append({'id': k, 'name': name, 'lnglat': [round(ll[0], 6), round(ll[1], 6)], 'inventory_claims': sorted(inv.get(k, []))})
    for k in sorted(set(inv) - set(FARMS)):
        farm_out.append({'id': k, 'name': k.replace('_', ' ') + ' farm (no farmstead outline in the repository)', 'lnglat': None, 'inventory_claims': sorted(inv[k])})
    # nearest farmstead of each field cell (a label only)
    for u in units:
        if u['cls'] == 'field':
            c = u['geom'].centroid
            dist = sorted((c.distance(p), k) for k, p in farms.items())
            u['farm_guess'] = dist[0][1] if dist[0][0] < 900 else None
    # claim trim
    cl_out = []
    for cid in sorted(claims):
        c = claims[cid]
        r = {k: c[k] for k in ('id', 'src', 'tier', 'kind', 'says', 'feature') if k in c}
        r['quote'] = c['quote_found']
        r['when'] = c.get('when')
        r['loc'] = {k: v for k, v in c['locator'].items() if k in ('pdf_page', 'page', 'report', 'who', 'char_start')}
        if c.get('about'):
            r['about'] = c['about']
        if c.get('note'):
            r['note'] = c['note']
        if c.get('src_sha256'):
            r['src_sha256'] = c['src_sha256']
        if cid in unplaced:
            r['placed'] = False
        cl_out.append(r)
    # units out
    uo = []
    for u in units:
        g = u['geom']
        if g.geom_type != 'Polygon':
            g = max(polys(g), key=lambda q: q.area)
        simp = g.simplify(1.2 if u['cls'] != 'field' else 1.0)
        if simp.is_empty or simp.area < 20:
            simp = g
        holes = len(simp.interiors)
        rec = {'id': u['id'], 'cls': u['cls'], 'lc': u['lc'], 'area_ac': round(g.area / ACRE, 2), 'rings': [ll_ring(simp)]}
        rec['name'] = u['lc_name']
        if holes:
            rec['holes_dropped'] = holes
        rec['geom_tier'] = 'plausible-procedural' if u['cls'] == 'field' and u.get('subdivided') else ('documented' if u.get('lc_conf') == 'Documented' else 'inferred')
        if u['cls'] == 'field':
            rec['geom_note'] = 'cell of a block of open ground cut by a seeded relaxation: the edges inside the block are not mapped' if u.get('subdivided') else 'a block of open ground between roads, lanes, confirmed fences and the outlines of woods and orchards'
            if u.get('farm_guess'):
                rec['farm_guess'] = u['farm_guess']
        for k in ('crop', 'crop_tier', 'crop_basis', 'crop_claim', 'crop_role', 'rock', 'woods', 'orchard', 'p', 'seed', 'ev'):
            if k in u:
                rec[k] = u[k]
        rec['claims'] = u['claims']
        uo.append(rec)
    return units, uo, cl_out, farm_out, events, wts, mix, farm_rows, acres, lrt_units, unplaced, terr, S


def source_titles(claims):
    """a readable title for every source key the claims cite (OR27; NPS:<ID> from the index of the web task; WS9:<ID> from the library index; WEB:<ID> from its meta file)"""
    import re
    nps = {}
    idx = os.path.join(BT, 'GOVERNANCE', 'horde', 'ws-web', 'nps', 'INDEX.md')
    if os.path.exists(idx):
        for m in re.finditer(r'^## (\S+)\n\n- Title: (.+)$', open(idx, encoding='utf-8').read(), re.M):
            nps[m.group(1)] = m.group(2).strip()
    ws9 = {it['id']: it for it in load(os.path.join(BT, 'GOVERNANCE', 'library', 'acquired_2.json'))['items']}
    out = {}
    for c in claims.values():
        k = c['src'].split('#')[0]
        if k in out:
            continue
        if k == 'OR27':
            out[k] = 'The War of the Rebellion: Official Records of the Union and Confederate Armies, Series I, vol. 27 (Gettysburg Campaign)'
        elif k.startswith('NPS:'):
            out[k] = nps.get(k[4:], k[4:])
        elif k.startswith('WS9:'):
            it = ws9.get(k[4:]); out[k] = (it['title'] + (' (' + str(it['date']) + ')' if it.get('date') else '')) if it else k[4:]
        elif k.startswith('WEB:'):
            mp = os.path.join(ROOT, 'tmp', 'library', 'web', 'veg', k[4:] + '.meta.json')
            out[k] = load(mp)['title'] if os.path.exists(mp) else k[4:]
    return out


def calendar_json():
    cal = {'epoch': '1863-06-01T00:00', 'unit': 'minutes', 'crops': {}, 'epilogue': {}, 'leaf': TB.LEAF, 'orchard_fruit': {}}
    for k, c in TB.CROPS.items():
        e = {'label': c['label'], 'keys': [dict(x, t=iso_min(x['d']), **({'doc_min': [iso_min(x['doc'][0]), iso_min(x['doc'][1])]} if x.get('doc') else {})) for x in c['keys']]}
        if c.get('harvest'):
            h = dict(c['harvest'])
            h['earliest_min'], h['latest_min'] = iso_min(h['earliest']), iso_min(h['latest'])
            e['harvest'] = h
            e['cut'] = c['cut']
        cal['crops'][k] = e
    cal['epilogue'] = dict(TB.EPILOGUE, t=iso_min('1863-11-19'))
    for k, f in TB.ORCHARD_FRUIT.items():
        cal['orchard_fruit'][k] = {'keys': [dict(x, t=iso_min(x['d'])) for x in f['keys']], 'why': f['why']}
    cal['lodging'] = {'from_min': iso_min('1863-07-03T22:00'), 'to_min': iso_min('1863-07-04T14:00'), 'crops': ['wheat', 'rye', 'barley', 'oats'], 'why': 'heavy rain from late 3 July into 4 July (weather record); the share of the standing crop laid flat is the scenario CF-VEG-RAIN'}
    return cal


def write_all(args):
    units, uo, cl_out, farm_out, events, wts, mix, farm_rows, acres, lrt_units, unplaced, terr, S = make_output(args)
    claims_all = {c['id']: c for c in load(CLAIMS)}
    ids = {c['id'] for c in cl_out}
    # every claim named by a table, an event or a unit exists
    import re
    txt = open(os.path.join(HERE, 'veg_tables.py'), encoding='utf-8').read()
    miss = sorted(set(re.findall(r'VC-[A-Z0-9]+(?:-[A-Za-z0-9]+)+', txt)) - ids)
    assert not miss, 'the tables cite claims that do not exist: %s' % miss
    sc = json.loads(json.dumps(TB.SCENARIOS))
    sc['CF-VEG-LRT']['lrt_units'] = lrt_units
    lrt = gz_point_ll('Little Round Top')
    sc['CF-VEG-LRT']['summit'] = {'lnglat': lrt, 'r_m': 90}
    meta = {
        'title': 'Vegetation of July 1863',
        'schema': SCHEMA,
        'requirement': 'R20', 'gate': 'Q21',
        'as_of': '2026-11-13',
        'time': {'unit': 'minutes since 1863-06-01 00:00 local mean time', 'window': ['1863-06-26T00:00', '1863-07-14T24:00'], 'epilogue': '1863-11-19'},
        'ground': {'lng': [terr['lng0'], terr['lng1']], 'lat': [terr['lat0'], terr['lat1']], 'note': 'units are clipped to the ground the theatre loads'},
        'geometry': {'woods_orchards_trees': 'the land-cover layer of the 1863 base map, outlined from the Warren survey of 1868-69 and placed to 30-40 m (docs/basemap1863/SOURCES-landcover.md); woodlot extents are those of 1868-69',
                     'fields': 'open ground cut by roads, lanes, railway and the 30 confirmed fence lines, then divided into cells of about 14 acres by a seeded relaxation: the edges inside a block are not mapped (plausible-procedural)',
                     'trees': 'not stored: each tree is placed at run time by a seeded scatter inside its unit (rows for orchards)'},
        'counts': {'units': len(uo), 'by_class': dict(collections.Counter(u['cls'] for u in uo)), 'claims': len(cl_out), 'claims_unplaced': len(unplaced), 'events': len(events), 'witness_trees': len(wts)},
        'source_titles': source_titles(claims_all),
        'tiers': {'units_geometry': dict(collections.Counter(u['geom_tier'] for u in uo)), 'field_crops': dict(collections.Counter(u.get('crop_tier') for u in uo if u['cls'] in ('field', 'wheatfield')))},
        'sources': {'landcover_sha256': {n: sha256_file(os.path.join(LC, n + '.geojson')) for n in ('woods_1863', 'orchards_1863', 'scattered_trees_1863', 'marsh_wetland_1863', 'boulder_fields_1863', 'open_cleared_1863', 'fields_documented_1863', 'open_ground_1863')},
                    'claims_sha256': sha256_file(CLAIMS)},
        'mix': {'shares': mix, 'acres_read': {k: round(v, 1) for k, v in sorted(acres.items())}, 'farms': farm_rows, 'tier': 'plausible-procedural',
                'basis': 'shares of the acreages the damage claims of the farms in `farms` destroyed (arable and hay), with pasture raised to its floor; a draw from this mix assigns the crop of every cell no claim names'},
    }
    doc = {'schema': SCHEMA, 'meta': meta, 'calendar': calendar_json(), 'species': TB.SPECIES, 'woods_classes': TB.WOODS, 'orchard_classes': TB.ORCHARD, 'scenarios': sc, 'farms': farm_out, 'witness_trees': wts, 'events': events,
           'gaps': [{'id': g[0], 'title': g[1], 'what': g[2], 'why': g[3], 'tier': g[4], 'register': 'ws-world-veg-' + g[0]} for g in TB.GAPS], 'claims': cl_out, 'units': uo}
    text = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
    return text, doc


def gz_point_ll(name):
    g = gazetteer()[name]
    ll = TO_LL.transform(g.x, g.y)
    return [round(ll[0], 6), round(ll[1], 6)]


def write_register(doc):
    d = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-world', 'proposed-register')
    os.makedirs(d, exist_ok=True)
    for g in doc['gaps']:
        path = os.path.join(d, g['register'] + '.md')
        body = ('# %s: %s\n\n| Field | Content |\n|---|---|\n| ID | %s |\n| Requirement IDs | R20, Q21 |\n| Category | %s |\n| Description | %s |\n| Why literal 100%% is not possible or blocked | %s |\n'
                '| Evidence searched / action | Official Records vol. 27 (tools/bt/or27_find.py), the National Park Service landscape reports saved by the web task (73 texts), the public-domain books and 1863 newspapers of the library; every quote of the claims is looked up again in the saved text (tools/bt/vegetation/verify_claims.py). The claims are in app/data/vegetation.json. |\n'
                '| Autonomous substitute applied | A calendar of ranges and seeded draws, drawn in the theatre and marked with the tier in the Vegetation panel (More). |\n| Confidence tier | %s |\n'
                '| Product marking | Tier pill on the unit card and on the legend; the ground overlay hatches every unit that is not documented; the gap is listed in the Vegetation panel. |\n| Review status | internal review only (DEC-006: no public review label) |\n| Owner decision requested | none (work continues) |\n| Status | open |\n') % (
            g['register'], g['title'], g['register'], 'evidence missing', g['what'], g['why'], g['tier'])
        with open(path, 'w', encoding='utf-8') as f:
            f.write(body)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--no-register', action='store_true')
    a = ap.parse_args()
    text, doc = write_all(a)
    m = doc['meta']
    print('units', m['counts'], 'bytes', len(text.encode()))
    print('tiers', m['tiers'])
    print('mix', m['mix']['shares'])
    if a.check:
        old = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
        print('check:', 'same' if old == text else 'DIFFERENT')
        sys.exit(0 if old == text else 1)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(text)
    if not a.no_register:
        write_register(doc)
    print('wrote', OUT)
