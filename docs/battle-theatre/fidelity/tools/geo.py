"""Local geodesy + 3DEP elevation sampling for the fidelity pilot.
Elevation comes from the cached USGS 3DEP blocks of docs/pitch/anim2/basemap (z15 grid, ~1.8 m/px at this latitude).
Read-only. The cache path is tmp/look-dev/basemap/cache/dem (produced by docs/pitch/anim2/basemap/tools/fetch-dem.py)."""
import math, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'docs', 'pitch', 'anim2', 'basemap', 'tools'))
from dem import DemMosaic          # noqa: E402
from common import world_px        # noqa: E402
import numpy as np                 # noqa: E402

LAT0, LON0 = 39.7921, -77.2366     # origin near Little Round Top
M_LAT = 111132.92 - 559.82 * math.cos(2 * math.radians(LAT0))
M_LON = 111412.84 * math.cos(math.radians(LAT0)) - 93.5 * math.cos(3 * math.radians(LAT0))

def to_xy(lon, lat):               # east, north metres from the origin
    return ((lon - LON0) * M_LON, (lat - LAT0) * M_LAT)

def to_ll(x, y):
    return (LON0 + x / M_LON, LAT0 + y / M_LAT)

def dist_m(a, b):
    ax, ay = to_xy(*a); bx, by = to_xy(*b)
    return math.hypot(ax - bx, ay - by)

def bearing(a, b):                 # degrees true, 0 = north, clockwise
    ax, ay = to_xy(*a); bx, by = to_xy(*b)
    return math.degrees(math.atan2(bx - ax, by - ay)) % 360

_m = None
def _mosaic():
    global _m
    if _m is None:
        _m = DemMosaic(15, 14)
    return _m

_win = {}
def elev(lon, lat):
    """bilinear elevation (m) from the 3DEP z15 grid"""
    X, Y = world_px(lon, lat, 15)
    x0, y0 = int(math.floor(X)), int(math.floor(Y))
    key = (x0 // 64, y0 // 64)
    if key not in _win:
        _win[key] = (key[0] * 64 - 2, key[1] * 64 - 2, _mosaic().window(key[0] * 64 - 2, key[1] * 64 - 2, 68, 68))
    ox, oy, w = _win[key]
    if not (0 <= x0 - ox < 66 and 0 <= y0 - oy < 66):
        w = _mosaic().window(x0 - 1, y0 - 1, 4, 4); ox, oy = x0 - 1, y0 - 1
    fx, fy = X - x0, Y - y0
    i, j = y0 - oy, x0 - ox
    v = (w[i, j] * (1 - fx) * (1 - fy) + w[i, j + 1] * fx * (1 - fy) + w[i + 1, j] * (1 - fx) * fy + w[i + 1, j + 1] * fx * fy)
    return float(v)

def slope_aspect(lon, lat, d=12.0):
    """terrain slope (deg) and downslope aspect (deg true) from central differences over +-d metres"""
    x, y = to_xy(lon, lat)
    ze = elev(*to_ll(x + d, y)); zw = elev(*to_ll(x - d, y)); zn = elev(*to_ll(x, y + d)); zs = elev(*to_ll(x, y - d))
    dzdx, dzdy = (ze - zw) / (2 * d), (zn - zs) / (2 * d)
    slope = math.degrees(math.atan(math.hypot(dzdx, dzdy)))
    aspect = math.degrees(math.atan2(-dzdx, -dzdy)) % 360   # direction water runs downhill
    return slope, aspect

def tobler_speed_mpm(slope_frac):
    """Tobler's hiking function, metres per minute (off-road factor applied by the caller)"""
    return 6000.0 * math.exp(-3.5 * abs(slope_frac + 0.05)) / 60.0

def path_time_min(pts, mode_mpm, rough=1.0, step=15.0):
    """travel time along a polyline of (lon,lat): drill speed mode_mpm (m/min) times Tobler's relative slope penalty (1 on the optimum -2.9 deg downhill) times a rough-ground factor.
    Returns (minutes, metres, ascent_m)"""
    t = 0.0; L = 0.0; asc = 0.0
    for a, b in zip(pts, pts[1:]):
        d = dist_m(a, b); n = max(1, int(d // step)); seg = d / n
        for k in range(n):
            f0, f1 = k / n, (k + 1) / n
            p0 = (a[0] + (b[0] - a[0]) * f0, a[1] + (b[1] - a[1]) * f0); p1 = (a[0] + (b[0] - a[0]) * f1, a[1] + (b[1] - a[1]) * f1)
            dz = elev(*p1) - elev(*p0)
            sl = dz / seg
            v = mode_mpm * (tobler_speed_mpm(sl) / tobler_speed_mpm(-0.05)) * rough   # drill speed scaled by Tobler's relative slope penalty
            t += seg / v; L += seg; asc += max(0, dz)
    return t, L, asc
