"""Draw the 1863 features (roads, railway, bridges, fences, buildings, orchards, wheat) onto a window of the cleaned photograph.
Each draw_* function takes the float image `img` (h,w,3) (modified in place) and returns a uint8 raster of the same size with the provenance code of what it drew (0 = nothing)
plus a uint8 confidence raster (1 Documented, 2 Estimated, 3 Contested/Unknown)."""
import numpy as np, cv2, math, zlib
import common as C
import render as R
from render import S, SUN_TO, SHADOW_DIR_ENU
from shapely.geometry import Polygon, Point, box as sbox
from shapely import affinity

P_ROAD, P_RAIL, P_BRIDGE, P_FENCE, P_STRUCT, P_ORCHARD, P_WHEAT, P_MASS = 6, 7, 8, 9, 10, 11, 12, 13
CONF = {'Documented': 1, 'Estimated': 2, 'Contested': 3, 'Unknown': 3}

def hit(items, win, pad=40, key='geom'):
    bb = sbox(win.bbox[0] - pad, win.bbox[1] - pad, win.bbox[2] + pad, win.bbox[3] + pad)
    return [it for it in items if it[key].intersects(bb)]

def _put(prov, conf, mask, code, cf):
    sel = mask & ((prov == 0) | (code >= prov))
    prov[sel] = code; conf[sel] = cf

def draw_roads(win, img, items, prov, conf):
    groups = {}
    for it in hit(items['roads'], win):
        groups.setdefault((it['width'], it['subtype'].startswith('turnpike')), []).append(it)
    for (w, pike), its in groups.items():
        a, d = R.ribbon_alpha(win, [i['geom'] for i in its], w, seed=int(w * 10))
        if a.max() <= 0:
            continue
        base = R.ROAD_MACADAM if pike else R.ROAD_DIRT
        n = R.hash_noise((win.h, win.w), win.ox, -win.oy, 9.0, 21) - 0.5
        tone = 1.0 + 0.10 * n                                       # wear: lighter and darker stretches
        col = base[None, None, :] * tone[..., None]
        # wheel ruts (dirt only): two darker lines at 0.28 w from the centre; macadam is smoother and has a slightly crowned lighter centre
        if not pike:
            rut = np.exp(-((np.abs(d) - 0.26 * w) / 0.55) ** 2)
            col = col * (1 - 0.07 * rut)[..., None]
            col[..., 1] *= (1 + 0.01 * (np.abs(d) < 0.15 * w))[...]
        g = R.grain_field((win.h, win.w), win.c0, win.r0)
        col = col + g * 0.9
        # the road replaces the ground: keep a little of the ground texture underneath (dust, stones) so the ribbon is not a flat decal
        aa = np.clip(a * 0.96, 0, 1)[..., None]
        # verge: the ground just outside the ribbon is slightly darker and greener (drainage ditch, compacted edge)
        verge = np.clip(1 - (d - w / 2) / 1.3, 0, 1) * (d > w / 2 - 0.2) * (1 - a)
        img[...] = (img * (1 - 0.06 * verge[..., None])) * (1 - aa) + col * aa
        cf = 1 if all(i['conf'] == 'Documented' for i in its) else 2
        _put(prov, conf, a > 0.35, P_ROAD, cf)

def draw_rails(win, img, items, prov, conf):
    for it in hit(items['rails'], win):
        if it['kind'] == 'track':
            a, d = R.ribbon_alpha(win, [it['geom']], 3.6, seed=31, noise_amp=0.2)
            col = np.array([138.0, 134.0, 127.0])[None, None, :] + 0 * a[..., None]
            tie = (np.abs(d) < 0.9) & (np.abs(d) > 0.45)
            col = col * (1 - 0.18 * tie)[..., None]                    # the two rails: a darker pair, 1 px
            col = col + R.grain_field((win.h, win.w), win.c0, win.r0) * 1.2
            aa = np.clip(a * 0.95, 0, 1)[..., None]
        else:
            a, d = R.ribbon_alpha(win, [it['geom']], 6.0, seed=33, noise_amp=0.8)
            col = np.array([176.0, 160.0, 132.0])[None, None, :] + 0 * a[..., None]
            col = col * (1 - 0.08 * np.clip(np.abs(d) / 3.0, 0, 1))[..., None]    # bare earth, a little shaded at the cut/fill shoulders
            col = col + R.grain_field((win.h, win.w), win.c0, win.r0) * 1.4
            aa = np.clip(a * 0.9, 0, 1)[..., None]
        img[...] = img * (1 - aa) + col * aa
        _put(prov, conf, a > 0.35, P_RAIL, CONF.get(it['conf'], 2))

def _nearest_tangent(roads, pt):
    best = None
    for r in roads:
        g = r['geom']
        dd = g.distance(pt)
        if best is None or dd < best[0]:
            best = (dd, r)
    if best is None:
        return None, None
    g = best[1]['geom']
    # nearest point and a local tangent from points 3 m either side along the (merged) line
    from shapely.ops import nearest_points, linemerge
    lines = [g] if g.geom_type == 'LineString' else list(g.geoms)
    bl = min(lines, key=lambda l: l.distance(pt))
    s = bl.project(pt)
    p0 = bl.interpolate(max(s - 3, 0)); p1 = bl.interpolate(min(s + 3, bl.length))
    t = np.array([p1.x - p0.x, p1.y - p0.y]); nt = np.hypot(*t)
    t = t / nt if nt > 0 else np.array([1.0, 0.0])
    q = bl.interpolate(s)
    return (q.x, q.y), t

def draw_bridges(win, img, items, prov, conf):
    for it in hit(items['bridges'], win, key='pt'):
        pos, t = _nearest_tangent(items['roads'], it['pt'])
        if pos is None:
            continue
        # snapped to the road centre line (the catalogue's bridge point has up to 30 m position error)
        wroad = max([r['width'] for r in items['roads'] if r['id'] == it['road']] + [5.0])
        L, Wd = 11.0, wroad + 1.0
        poly = Polygon([(-L / 2, -Wd / 2), (L / 2, -Wd / 2), (L / 2, Wd / 2), (-L / 2, Wd / 2)])
        ang = math.degrees(math.atan2(t[1], t[0]))
        poly = affinity.translate(affinity.rotate(poly, ang, origin=(0, 0)), pos[0], pos[1])
        sh = R.shade_poly_shadow(win, [poly], 2.5)
        m = np.zeros((win.h * S, win.w * S), np.float32); R.fill_poly(m, win, poly, 1.0); a = R.down(m)
        col = np.array([148.0, 140.0, 126.0])[None, None, :] + R.grain_field((win.h, win.w), win.c0, win.r0) * 1.2
        img[...] = img * (1 - 0.30 * (sh * (1 - a))[..., None]) * (1 - a[..., None]) + col * a[..., None]
        _put(prov, conf, a > 0.35, P_BRIDGE, CONF.get(it['conf'], 2))

def draw_fences(win, img, items, prov, conf):
    its = hit(items['fences'], win, pad=10)
    if not its:
        return
    m = np.zeros((win.h * S, win.w * S), np.float32); ms = np.zeros_like(m)
    dxs, dys = SHADOW_DIR_ENU
    for it in its:
        for ls in R._lines(it['geom']):
            cv2.polylines(m, [win.cvpts(ls.coords)], False, 1.0, 2 if not it['stone'] else 3, lineType=cv2.LINE_AA, shift=4)
            sh = affinity.translate(ls, dxs * 1.0, dys * 1.0)
            cv2.polylines(ms, [win.cvpts(sh.coords)], False, 1.0, 2, lineType=cv2.LINE_AA, shift=4)
    a = R.down(m); s_ = R.down(ms)
    col = np.array([138.0, 126.0, 108.0])[None, None, :]
    img[...] = img * (1 - 0.18 * (s_ * (1 - a))[..., None])
    img[...] = img * (1 - 0.5 * a[..., None]) + col * 0.5 * a[..., None]
    _put(prov, conf, a > 0.2, P_FENCE, 2)

ROOF = {'shingle': np.array([128.0, 117.0, 106.0]), 'slate': np.array([102.0, 105.0, 111.0]), 'brick_roof': np.array([132.0, 110.0, 99.0]), 'tin': np.array([156.0, 155.0, 152.0])}
HEIGHT = {'farmhouse': 8.0, 'house': 7.0, 'barn': 11.0, 'bank_barn': 12.0, 'building': 5.5, 'outbuilding': 4.5, 'institutional': 10.0, 'log_building': 4.5, 'farmstead': 7.0, 'stable': 6.0, 'smokehouse': 3.5, 'wagon_shed': 5.0}

def _footprint(it, roads):
    from s34_prepare import DEFAULT_DIM
    g = it['geom']
    if g.geom_type == 'Polygon':
        mrr = g.minimum_rotated_rectangle
        return g
    sub = it['sub']
    dm = it['dims'] or DEFAULT_DIM.get(sub, (9.0, 6.0))
    L, Wd = max(dm), min(dm)
    pos, t = _nearest_tangent(roads, g) if roads else (None, None)
    ang = math.degrees(math.atan2(t[1], t[0])) if t is not None and Point(pos).distance(g) < 90 else 0.0
    if sub in ('barn', 'bank_barn') and t is not None:
        ang += 90.0 if zlib.crc32(it['id'].encode()) % 2 else 0.0          # barns sit gable-end or broadside to the lane: unknown, alternate deterministically
    rect = Polygon([(-L / 2, -Wd / 2), (L / 2, -Wd / 2), (L / 2, Wd / 2), (-L / 2, Wd / 2)])
    return affinity.translate(affinity.rotate(rect, ang, origin=(0, 0)), g.x, g.y)

def _roof_polys(win, img, poly, height, base, rng_seed, conf_val, ridge=None):
    """gable roof on a polygon: two planes about the ridge, lit from the south-east; returns the alpha"""
    m = np.zeros((win.h * S, win.w * S), np.float32); R.fill_poly(m, win, poly, 1.0); a = R.down(m)
    if a.max() <= 0:
        return None
    mrr = poly.minimum_rotated_rectangle
    xs, ys = mrr.exterior.coords.xy
    e1 = np.array([xs[1] - xs[0], ys[1] - ys[0]]); e2 = np.array([xs[2] - xs[1], ys[2] - ys[1]])
    if np.hypot(*e1) >= np.hypot(*e2):
        u = e1 / np.hypot(*e1)                  # ridge along the long axis
    else:
        u = e2 / np.hypot(*e2)
    if ridge is not None:
        u = np.array(ridge, float) / np.hypot(*ridge)
    perp = np.array([-u[1], u[0]])
    cx, cy = poly.centroid.x, poly.centroid.y
    gx = (np.arange(win.w) + 0.5 + win.c0) + C.X0 - 0 ; gy = C.Y0 - (np.arange(win.h) + 0.5 + win.r0)
    GX, GY = np.meshgrid(gx, gy)
    s = (GX - cx) * perp[0] + (GY - cy) * perp[1]          # signed distance across the ridge, metres
    lit = float(np.dot(perp, SUN_TO))                      # >0: the +perp plane faces the sun
    fac = 1.0 + 0.30 * np.sign(s) * lit + 0.05 * np.clip(-np.abs(s) / 3.0 + 1.0, 0, 1) * 0
    ridge = np.exp(-(s / 0.45) ** 2)
    col = base[None, None, :] * fac[..., None] * (1 + 0.10 * ridge)[..., None]
    nn = R.hash_noise((win.h, win.w), win.ox, -win.oy, 2.0, 5 + rng_seed) - 0.5
    col = col * (1 + 0.10 * nn)[..., None] + R.grain_field((win.h, win.w), win.c0, win.r0) * 1.6
    return a, col

def split_lots(poly, seed):
    """a long thin symbol (a row of buildings) is cut across its long axis into lots of 7 to 11 m; ridges then run across the row (gable ends to the street). Schematic: lot boundaries are not in the source."""
    from shapely.geometry import LineString
    from shapely.ops import split
    mrr = poly.minimum_rotated_rectangle
    xs, ys = mrr.exterior.coords.xy
    e1 = np.array([xs[1] - xs[0], ys[1] - ys[0]]); e2 = np.array([xs[2] - xs[1], ys[2] - ys[1]])
    if np.hypot(*e1) >= np.hypot(*e2):
        u = e1 / np.hypot(*e1); L = np.hypot(*e1); Wd = np.hypot(*e2)
    else:
        u = e2 / np.hypot(*e2); L = np.hypot(*e2); Wd = np.hypot(*e1)
    if L < 1.8 * Wd or L < 18:
        return [(poly, None)]
    perp = np.array([-u[1], u[0]])
    c = np.array([mrr.centroid.x, mrr.centroid.y])
    rng = np.random.default_rng(seed)
    pos = -L / 2
    cuts = []
    while True:
        pos += rng.uniform(7.0, 11.0)
        if pos > L / 2 - 4:
            break
        cuts.append(pos)
    pieces = [poly]
    for t in cuts:
        p0 = c + u * t - perp * 60; p1 = c + u * t + perp * 60
        out = []
        for pc in pieces:
            try:
                res = split(pc, LineString([p0, p1]))
                out += [g for g in res.geoms if g.area > 4]
            except Exception:
                out.append(pc)
        pieces = out
    return [(g, tuple(perp)) for g in pieces]

def draw_structures(win, img, items, prov, conf):
    its = hit(items['structures'], win, pad=30)
    if not its:
        return
    polys = []; metas = []; ridges = []
    for it in its:
        if it.get('src') == 'hopkins':
            for k, (g, rd) in enumerate(split_lots(it['geom'], zlib.crc32(it['id'].encode()))):
                polys.append(g); metas.append(dict(it, id=it['id'] + '-%d' % k)); ridges.append(rd)
            continue
        fp = _footprint(it, items['roads'])
        polys.append(fp); metas.append(it); ridges.append(None)
    # shadows first (ground), then roofs
    for fp, it in zip(polys, metas):
        h = HEIGHT.get(it['sub'], 6.0)
        sh = R.shade_poly_shadow(win, [fp], h)
        m = np.zeros((win.h * S, win.w * S), np.float32); R.fill_poly(m, win, fp, 1.0); a = R.down(m)
        img[...] = img * (1 - 0.40 * (sh * (1 - a))[..., None])
    for (fp, it), rd in zip(zip(polys, metas), ridges):
        mat = (it.get('material') or '') + ' ' + (it.get('roof') or '')
        if 'slate' in mat: base = ROOF['slate']
        elif 'tin' in mat or 'metal' in mat: base = ROOF['tin']
        elif it.get('src') == 'hopkins':
            k = zlib.crc32(it['id'].encode()) % 10        # town roofs: mostly wood shingle, some slate and tin (a schematic mix; no roof material is recorded on the inset)
            base = ROOF['shingle'] if k < 6 else (ROOF['slate'] if k < 8 else (ROOF['tin'] if k < 9 else ROOF['brick_roof']))
        else: base = ROOF['shingle']
        res = _roof_polys(win, img, fp, HEIGHT.get(it['sub'], 6.0), base, zlib.crc32(it['id'].encode()) % 97, 1, ridge=rd)
        if res is not None:
            a, col = res
            img[...] = img * (1 - a[..., None]) + col * a[..., None]
            _put(prov, conf, a > 0.4, P_STRUCT, CONF.get(it['conf'], 2))

def draw_masses(win, img, items, prov, conf):
    its = hit(items['masses'], win, pad=30)
    if not its:
        return
    polys = [it['geom'] for it in its]
    sh = R.shade_poly_shadow(win, polys, 8.0)
    m = np.zeros((win.h * S, win.w * S), np.float32)
    for p in polys:
        R.fill_poly(m, win, p, 1.0)
    a = R.down(m)
    img[...] = img * (1 - 0.40 * (sh * (1 - a))[..., None])
    # roofscape: cells of about 7 m (Voronoi by hashed lattice) with their own roof tone, ridges perpendicular to the larger gradient of the mass; party-wall hairlines between cells
    gx = (np.arange(win.w) + 0.5 + win.c0) + C.X0; gy = C.Y0 - (np.arange(win.h) + 0.5 + win.r0)
    GX, GY = np.meshgrid(gx, gy)
    cell = 7.0
    ix = np.floor(GX / cell).astype(np.int64); iy = np.floor(GY / cell).astype(np.int64)
    best = np.full(GX.shape, 1e9, np.float32); cid = np.zeros(GX.shape, np.int64)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            jx = ix + dx; jy = iy + dy
            h1 = ((jx * 73856093) ^ (jy * 19349663)) & 0xFFFF; h2 = ((jx * 83492791) ^ (jy * 2654435761)) & 0xFFFF
            px = (jx + 0.15 + 0.7 * (h1 / 65535.0)) * cell; py = (jy + 0.15 + 0.7 * (h2 / 65535.0)) * cell
            dd = (GX - px) ** 2 + (GY - py) ** 2
            sel = dd < best
            best = np.where(sel, dd, best); cid = np.where(sel, (jx * 1000003 + jy) & 0xFFFFFF, cid)
    pick = (cid * 2654435761 & 0xFFFF) / 65535.0
    pal = np.stack([ROOF['shingle'], ROOF['slate'], ROOF['brick_roof'], ROOF['shingle'] * 1.12], 0)
    k = np.minimum((pick * 4).astype(int), 3)
    base = pal[k]
    # two-plane shading per cell along a hashed ridge direction (street-parallel gables are the rule in a 1860s town: use the nearest axis of the mass)
    ang = (((cid * 40503) & 0xFFFF) / 65535.0 < 0.5)
    u = np.where(ang[..., None], np.array([1.0, 0.0]), np.array([0.0, 1.0]))
    perp = np.stack([-u[..., 1], u[..., 0]], -1)
    cpx = np.sqrt(best)  # distance to the cell seed (proxy for the ridge distance)
    s = np.sin(GX * perp[..., 0] * 0.9 + GY * perp[..., 1] * 0.9)
    lit = (perp[..., 0] * SUN_TO[0] + perp[..., 1] * SUN_TO[1])
    fac = 1.0 + 0.22 * np.sign(s) * lit
    col = base * fac[..., None] * (1 + 0.1 * (R.hash_noise((win.h, win.w), win.ox, -win.oy, 2.0, 9) - 0.5))[..., None]
    # party-wall hairlines: where the nearest and second nearest seeds are almost equally close (cell edges)
    edge = np.abs(np.sqrt(best) - cpx) < 0.01
    col = col + R.grain_field((win.h, win.w), win.c0, win.r0) * 1.6
    # mass edge: dark eave line
    er = cv2.erode(a, np.ones((3, 3), np.uint8))
    col = col * (1 - 0.18 * np.clip(a - er, 0, 1))[..., None]
    img[...] = img * (1 - a[..., None]) + col * a[..., None]
    _put(prov, conf, a > 0.4, P_MASS, 2)

def draw_orchards(win, img, region, orchards, prov, conf, crown_rgb=(86.0, 118.0, 86.0), spacing=9.1):
    """regular orchard rows on `region` (bool h,w): grid anchored at each orchard polygon's centroid, rotated with its minimum rotated rectangle; crowns lit from the south-east with shadows to the north-west"""
    if not region.any():
        return
    sh_acc = np.zeros((win.h * S, win.w * S), np.float32)
    cr_acc = np.zeros((win.h, win.w, 3), np.float32); cr_a = np.zeros((win.h, win.w), np.float32)
    ys_, xs_ = np.nonzero(region)
    bb = sbox(win.ox, win.oy - win.h, win.ox + win.w, win.oy)
    rng_cache = {}
    for op in orchards:
        pg = op['geom']
        if not pg.intersects(bb):
            continue
        mrr = pg.minimum_rotated_rectangle
        xs, ys = mrr.exterior.coords.xy
        e1 = np.array([xs[1] - xs[0], ys[1] - ys[0]])
        ang = math.atan2(e1[1], e1[0])
        ca, sa = math.cos(ang), math.sin(ang)
        cx, cy = pg.centroid.x, pg.centroid.y
        x0, y0, x1, y1 = pg.intersection(bb.buffer(20)).bounds if not pg.intersection(bb.buffer(20)).is_empty else (0, 0, 0, 0)
        if x1 <= x0:
            continue
        # lattice points in the rotated frame covering the clipped bounds
        corners = np.array([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
        u = (corners[:, 0] - cx) * ca + (corners[:, 1] - cy) * sa
        v = -(corners[:, 0] - cx) * sa + (corners[:, 1] - cy) * ca
        for iu in range(int(math.floor(u.min() / spacing)) - 1, int(math.ceil(u.max() / spacing)) + 2):
            for iv in range(int(math.floor(v.min() / spacing)) - 1, int(math.ceil(v.max() / spacing)) + 2):
                px = cx + iu * spacing * ca - iv * spacing * sa
                py = cy + iu * spacing * sa + iv * spacing * ca
                c = int(px - win.ox); r = int(win.oy - py)
                if c < 0 or r < 0 or c >= win.w or r >= win.h or not region[r, c]:
                    continue
                if not pg.contains(Point(px, py)):
                    continue
                hh = (iu * 73856093 ^ iv * 19349663 ^ int(cx)) & 0xFFFF
                jx = (hh / 65535.0 - 0.5) * 0.8; jy = (((hh * 40503) & 0xFFFF) / 65535.0 - 0.5) * 0.8
                rad = 2.0 + 0.6 * (((hh * 2654435761) & 0xFFFF) / 65535.0)
                _crown(win, cr_acc, cr_a, sh_acc, px + jx, py + jy, rad, crown_rgb, hh)
    sh = R.down(sh_acc)
    img[...] = img * (1 - 0.26 * (np.clip(sh, 0, 1) * (1 - cr_a))[..., None])
    img[...] = img * (1 - cr_a[..., None]) + cr_acc
    _put(prov, conf, cr_a > 0.3, P_ORCHARD, 2)

def _crown(win, cr_acc, cr_a, sh_acc, x, y, rad, rgb, hh):
    cc = (x - win.ox); rr = (win.oy - y)
    h = 4.5
    dxs, dys = SHADOW_DIR_ENU
    cv2.ellipse(sh_acc, (int(round((cc + dxs * 0.7 * h) * S * 16)), int(round((rr - dys * 0.7 * h) * S * 16))), (int(rad * 0.95 * S * 16), int(rad * 0.8 * S * 16)), 0, 0, 360, 1.0, -1, lineType=cv2.LINE_AA, shift=4)
    r0 = int(max(rr - rad - 2, 0)); r1 = int(min(rr + rad + 3, win.h)); c0 = int(max(cc - rad - 2, 0)); c1 = int(min(cc + rad + 3, win.w))
    if r1 <= r0 or c1 <= c0:
        return
    yy, xx = np.mgrid[r0:r1, c0:c1]
    dx = xx + 0.5 - cc; dy = yy + 0.5 - rr
    d = np.sqrt(dx * dx + dy * dy)
    a = np.clip((rad - d) / 1.2 + 0.2, 0, 1)
    # sun-lit south-east side, darker north-west, mottled
    lit = (dx * SUN_TO[0] + (-dy) * SUN_TO[1]) / max(rad, 1)       # image y runs down: north is -dy
    mott = ((np.sin(dx * 2.1 + hh) + np.sin(dy * 2.7 + hh * 0.3)) * 0.04)
    shade = 1.0 + 0.22 * lit + mott - 0.12 * (d / rad)
    col = np.array(rgb)[None, None, :] * shade[..., None]
    sub = cr_acc[r0:r1, c0:c1]; sa = cr_a[r0:r1, c0:c1]
    new_a = np.maximum(sa, a)
    # composite in place (later crowns over earlier ones)
    sub[...] = sub * (1 - a[..., None]) + col * a[..., None]
    cr_a[r0:r1, c0:c1] = 1 - (1 - sa) * (1 - a)

def recolour_wheat(win, img, region, canopy, prov, conf):
    """Wheat on 2 July 1863 (NPS marker: golden wheat; ripe or nearly ripe): the real field texture of the photograph is kept (luminance relief) and re-coloured to a ripe-wheat hue.
    The tone (golden-tan, about RGB 196,172,118 in this light) is ESTIMATED from the usual look of ripe winter wheat in summer aerial imagery; no 1863 colour record exists.
    The outline is the catalogue's Estimated outline and is feathered over about 6 m, not drawn as a hard shape."""
    reg = region.astype(np.float32)
    w = cv2.GaussianBlur(reg, (0, 0), 4.0) * (canopy == 0)
    w = np.clip(w * 1.15, 0, 1) * (cv2.GaussianBlur((canopy == 0).astype(np.float32), (0, 0), 1.0))
    m = w > 0.5
    if not m.any():
        return
    lab = cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
    L = lab[..., 0]
    Lm = L[m].mean()
    nz = R_noise(win)
    newL = np.clip(172.0 + (L - Lm) * 0.85 + nz * 5.0, 0, 255)
    newa = 130.5 + (lab[..., 1] - lab[..., 1][m].mean()) * 0.2
    newb = 150.0 + (lab[..., 2] - lab[..., 2][m].mean()) * 0.2
    out = cv2.cvtColor(np.stack([newL, newa, newb], -1).clip(0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)
    img[...] = img * (1 - w[..., None]) + out * w[..., None]
    _put(prov, conf, w > 0.5, P_WHEAT, 2)

def R_noise(win):
    return R.hash_noise((win.h, win.w), win.ox, -win.oy, 12.0, 77) - 0.5
