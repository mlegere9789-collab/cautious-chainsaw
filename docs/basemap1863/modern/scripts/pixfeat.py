"""Pixel features and weak labels for the modern-feature detector (1.0 m NAIP 2013-06-04, bands R,G,B,NIR).

Features (per pixel): R,G,B,NIR, NDVI, brightness, HSV saturation, (R-B)/(R+B), local std of brightness at 3x3 and 9x9,
local mean brightness 31x31 (context), brightness minus that mean.
Weak labels come from the vector inventory (never from the imagery):
  1 pavement  : within 1.2 m of a mapped road centre line (class by half width) or inside a mapped parking lot eroded 1 m
  2 roof      : inside an Adams County 2023 outline eroded 1.5 m
  3 background: farther than 30 m from every mapped road, parking lot, building, tower, pole, sign and monument
The classifier is therefore asked to separate surfaces that the maps say are modern from surfaces the maps say are far from anything modern.
"""
import numpy as np, cv2
from rasterio import features as rfeat
from rasterio.transform import from_origin
from shapely.geometry import box as sbox
from shapely.ops import unary_union

HALF_W = {'ROAD_ARTERIAL': 6.0, 'ROAD_LOCAL': 3.5, 'ROAD_SERVICE': 2.0, 'PATH': 1.2, 'TRACK': 1.5, 'RAIL': 3.0}


def feats(rgbn):
    """rgbn: uint8 (4,H,W) -> float32 (F,H,W)"""
    r, g, b, n = [rgbn[i].astype(np.float32) for i in range(4)]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    ndvi = (n - r) / (n + r + 1e-3)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / (mx + 1e-3)
    rb = (r - b) / (r + b + 1e-3)

    def lstd(a, k):
        m = cv2.blur(a, (k, k))
        return np.sqrt(np.maximum(cv2.blur(a * a, (k, k)) - m * m, 0))
    ctx = cv2.blur(lum, (31, 31))
    return np.stack([r, g, b, n, ndvi * 100, lum, sat * 100, rb * 100, lstd(lum, 3), lstd(lum, 9), ctx, lum - ctx]).astype(np.float32)


def raster_labels(recs, bounds, res, shape):
    """weak labels for one window: uint8 (H,W) 0 unknown, 1 pavement, 2 roof, 3 background"""
    H, W = shape
    tr = from_origin(bounds[0], bounds[3], res, res)
    win = sbox(*bounds).buffer(60)
    lab = np.zeros((H, W), np.uint8)
    near = []
    pav, roof, anymod = [], [], []
    for r in recs:
        g = r['geom']
        if not g.intersects(win):
            continue
        c = r['cls']
        if c in HALF_W:
            if g.geom_type in ('LineString', 'MultiLineString'):
                pav.append(g.buffer(min(HALF_W[c], 1.2)))
                anymod.append(g.buffer(HALF_W[c] + 25))
        elif c == 'PARKING' and g.geom_type in ('Polygon', 'MultiPolygon'):
            e = g.buffer(-1.0)
            if not e.is_empty:
                pav.append(e)
            anymod.append(g.buffer(30))
        elif c == 'BUILDING' and g.geom_type in ('Polygon', 'MultiPolygon'):
            e = g.buffer(-1.5)
            if not e.is_empty:
                roof.append(e)
            anymod.append(g.buffer(30))
        elif c in ('MONUMENT', 'POWER_SUPPORT', 'TOWER_COMM', 'TOWER_OBS', 'WATER_TOWER', 'INFO_SIGN', 'SITE_FURNITURE', 'STRUCTURE_OTHER', 'FLAGPOLE', 'POWER_LINE', 'GOLF', 'SPORTS_REC', 'AIRFIELD', 'POWER_SITE', 'DEVELOPED_LAND', 'FENCE_WALL'):
            anymod.append(g.buffer(30 if c != 'DEVELOPED_LAND' else 5))
    def ras(geoms, val, lab, only_zero=True):
        if not geoms:
            return
        m = rfeat.rasterize([(unary_union(geoms), 1)], out_shape=(H, W), transform=tr, fill=0, dtype='uint8')
        if only_zero:
            lab[(m == 1) & (lab == 0)] = val
        else:
            lab[m == 1] = val
    allm = np.zeros((H, W), np.uint8)
    if anymod:
        allm = rfeat.rasterize([(unary_union(anymod), 1)], out_shape=(H, W), transform=tr, fill=0, dtype='uint8')
    lab[allm == 0] = 3
    ras(pav, 1, lab, only_zero=False)
    ras(roof, 2, lab, only_zero=False)
    return lab
