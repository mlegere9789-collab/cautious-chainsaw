"""Shared helpers for the roads/rail/water catalogue (Gettysburg 1863 reconstruction).
Bounds come from docs/pitch/anim2/basemap/plan.json (sourceExtent + 1200 m margin)."""
import json, math, os
from pyproj import Transformer
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
CACHE = os.path.join(ROOT, 'tmp', 'b1863', 'roads', 'cache')
OUT = os.path.join(ROOT, 'docs', 'basemap1863', 'features', 'roads-rail-water')
W, S, E, N = -77.3178, 39.77, -77.18, 39.8594            # plan.json sourceExtent
_to_utm = Transformer.from_crs(4326, 32618, always_xy=True)
_to_ll = Transformer.from_crs(32618, 4326, always_xy=True)
_to_wm = Transformer.from_crs(4326, 3857, always_xy=True)
def ll2m(lng, lat): return _to_utm.transform(lng, lat)
def m2ll(x, y): return _to_ll.transform(x, y)
def ll2wm(lng, lat): return _to_wm.transform(lng, lat)
def in_box(lng, lat, pad=0.0):
    return W - pad <= lng <= E + pad and S - pad <= lat <= N + pad
def hav(a, b):
    (x1, y1), (x2, y2) = ll2m(*a), ll2m(*b)
    return math.hypot(x1 - x2, y1 - y2)
def line_len(coords):
    return sum(hav(coords[i], coords[i + 1]) for i in range(len(coords) - 1))
def dist_pt_seg(p, a, b):
    px, py = p; ax, ay = a; bx, by = b
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)
def dist_pt_line_m(pt_ll, line_ll):
    p = ll2m(*pt_ll); L = [ll2m(*c) for c in line_ll]
    return min(dist_pt_seg(p, L[i], L[i + 1]) for i in range(len(L) - 1))

MARGIN_M = 1200.0
# expanded box (sourceExtent + marginM), in degrees (approximate at 39.8N)
import math as _m
_dlat = MARGIN_M / 111_000.0; _dlng = MARGIN_M / (111_320.0 * _m.cos(_m.radians(39.81)))
XW, XS, XE, XN = W - _dlng, S - _dlat, E + _dlng, N + _dlat
def in_xbox(lng, lat): return XW <= lng <= XE and XS <= lat <= XN
