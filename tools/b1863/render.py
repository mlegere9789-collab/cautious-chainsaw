"""Drawing of 1863 features onto the cleaned photograph, window by window. Everything is rendered at 2x supersampling and reduced, lit from the sun of the base scene.

Light of the base scene (tools/b1863/sun_estimate.py): shadows fall toward the north-west (130 deg east-counterclockwise, i.e. map bearing 320 deg), shadow length about 1.1 x object height.
Colours come from measurements of the photograph itself (unpaved tracks: 29 mapped tracks, 3,846 samples, median-bright half RGB about 200,192,173; see BUILD.md).
Grain: every drawn surface carries real photographic grain, taken from a high-pass of a real clean field area of the same mosaic (GRAIN), never flat colour.
"""
import numpy as np, cv2, math, os
import common as C

S = 2                                   # supersampling
SUN_TO = np.array([0.6428, -0.7660])    # horizontal unit vector (east, north) from an object toward the sun (south-east): bearing 140 deg
SHADOW_DIR_ENU = -SUN_TO                # shadows fall away from the sun (north-west)
SHADOW_K = 1.1

ROAD_DIRT = np.array([190.0, 181.0, 162.0])
ROAD_MACADAM = np.array([186.0, 182.0, 172.0])

def hash_noise(shape, x0, y0, scale, seed):
    """smooth value noise on the absolute grid (x0, y0 in metres of UTM origin of the array), deterministic and seamless across windows"""
    h, w = shape
    # lattice of random values at spacing `scale` metres
    gx0 = int(math.floor(x0 / scale)) - 1; gy0 = int(math.floor(y0 / scale)) - 1
    nx = int(w / scale) + 4; ny = int(h / scale) + 4
    gy, gx = np.meshgrid(np.arange(gy0, gy0 + ny), np.arange(gx0, gx0 + nx), indexing='ij')
    hv = (gx * 73856093 ^ gy * 19349663 ^ seed * 83492791) & 0xFFFFFF
    rnd = (hv * 2654435761 & 0xFFFFFFFF) / 4294967295.0
    rnd = rnd.astype(np.float32)
    # upsample to metres
    xs = (np.arange(w) + x0) / scale - gx0; ys = (np.arange(h) + y0) / scale - gy0
    xs = np.clip(xs, 0, nx - 1.001); ys = np.clip(ys, 0, ny - 1.001)
    xi = xs.astype(int); yi = ys.astype(int); fx = (xs - xi).astype(np.float32); fy = (ys - yi).astype(np.float32)
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    a = rnd[yi][:, xi]; b = rnd[yi][:, xi + 1]; c = rnd[yi + 1][:, xi]; d = rnd[yi + 1][:, xi + 1]
    fxm = fx[None, :]; fym = fy[:, None]
    return (a * (1 - fxm) + b * fxm) * (1 - fym) + (c * (1 - fxm) + d * fxm) * fym

class Win:
    """a window of the build grid: rows r0:r1, cols c0:c1 (1 m pixels). geometry -> supersampled pixel coordinates"""
    def __init__(self, r0, r1, c0, c1):
        self.r0, self.r1, self.c0, self.c1 = r0, r1, c0, c1
        self.h, self.w = r1 - r0, c1 - c0
        self.ox = C.X0 + c0; self.oy = C.Y0 - r0       # UTM of the window's upper-left corner
        self.bbox = (self.ox, self.oy - self.h, self.ox + self.w, self.oy)
    def pts(self, coords):
        a = np.asarray(coords, float)
        return np.stack([(a[:, 0] - self.ox) * S, (self.oy - a[:, 1]) * S], 1)
    def cvpts(self, coords):
        return np.round(self.pts(coords) * 16).astype(np.int32)     # shift=4 fixed point for anti-aliased drawing

def _lines(geom):
    if geom.geom_type == 'LineString':
        return [geom]
    if geom.geom_type == 'MultiLineString':
        return list(geom.geoms)
    if geom.geom_type == 'GeometryCollection':
        out = []
        for g in geom.geoms: out += _lines(g)
        return out
    return []

def _polys(geom):
    if geom.geom_type == 'Polygon':
        return [geom]
    if geom.geom_type in ('MultiPolygon', 'GeometryCollection'):
        out = []
        for g in geom.geoms: out += _polys(g)
        return out
    return []

def down(a):
    return cv2.resize(a, (a.shape[1] // S, a.shape[0] // S), interpolation=cv2.INTER_AREA)

def fill_poly(canvas, win, poly, val=1.0):
    for p in _polys(poly):
        ext = win.cvpts(p.exterior.coords)
        cv2.fillPoly(canvas, [ext], val, lineType=cv2.LINE_AA, shift=4)
        for r in p.interiors:
            cv2.fillPoly(canvas, [win.cvpts(r.coords)], 0.0, lineType=cv2.LINE_AA, shift=4)

def ribbon_alpha(win, lines, width_m, noise_amp=0.45, seed=7):
    """alpha (h,w) 0..1 of a ribbon of the given width around the centre lines, with a naturally wavering edge, plus lateral coordinate d (metres from the centre line)"""
    cl = np.zeros((win.h * S, win.w * S), np.uint8)
    for g in lines:
        for ls in _lines(g):
            if ls.is_empty: continue
            cv2.polylines(cl, [win.cvpts(ls.coords)], False, 255, 1, lineType=cv2.LINE_8, shift=4)
    if not cl.any():
        z = np.zeros((win.h, win.w), np.float32)
        return z, z + 99
    dist = cv2.distanceTransform(255 - cl, cv2.DIST_L2, 5).astype(np.float32) / S       # metres
    n = hash_noise((win.h * S, win.w * S), win.ox, -win.oy, 14.0, seed) - 0.5
    n2 = hash_noise((win.h * S, win.w * S), win.ox, -win.oy, 3.5, seed + 1) - 0.5
    half = width_m / 2 + noise_amp * (n * 2 * 0.8 + n2 * 2 * 0.2)
    a = np.clip((half - dist) / 0.5 + 0.5, 0, 1)
    return down(a), down(dist)

GRAIN = None
def grain_field(shape, x0, y0):
    """photographic grain (zero mean, luminance + slight chroma) from a real high-pass tile, wrapped seamlessly by absolute position"""
    global GRAIN
    if GRAIN is None:
        GRAIN = np.load(os.path.join(C.BUILD, 'grain_tile.npy')).astype(np.float32)
    gh, gw = GRAIN.shape[:2]
    h, w = shape
    ys = (np.arange(h) + int(round(y0))) % gh; xs = (np.arange(w) + int(round(x0))) % gw
    return GRAIN[ys][:, xs]

def shade_poly_shadow(win, foot_polys, height_m):
    """cast shadow alpha of prisms: the footprint swept along the shadow direction by SHADOW_K*height (exact for convex footprints, stepwise union otherwise); soft alpha (h,w)"""
    from shapely.geometry import MultiPoint
    from shapely import affinity
    from shapely.ops import unary_union
    L = SHADOW_K * height_m
    dx, dy = SHADOW_DIR_ENU * L
    sh = np.zeros((win.h * S, win.w * S), np.float32)
    for p in foot_polys:
        for q in _polys(p):
            hull = q.convex_hull
            if q.area / max(hull.area, 1e-6) > 0.9:
                pts = list(q.exterior.coords) + [(x + dx, y + dy) for x, y in q.exterior.coords]
                fill_poly(sh, win, MultiPoint(pts).convex_hull, 1.0)
            else:
                steps = max(int(L), 2)
                fill_poly(sh, win, unary_union([affinity.translate(q, dx * t / steps, dy * t / steps) for t in range(steps + 1)]), 1.0)
    a = down(sh)
    return cv2.GaussianBlur(a, (0, 0), 0.7)
