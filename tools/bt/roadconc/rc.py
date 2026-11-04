"""Road-concordance helpers (new, 2026-10-22). Read-only use of the committed georeferences: Warren affine (docs/basemap1863/maps/transforms/warren-1869.json),
Bachelder sheet chains (tools/bt/troopmaps/common_tm.SheetTransform) and the Hopkins 1858 county and inset affines. Ground CRS EPSG:32618; WGS84 via pyproj."""
import os, sys, json
import numpy as np
from pyproj import Transformer
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
BASE = os.path.join(ROOT, 'docs', 'basemap1863', 'maps')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt', 'troopmaps'))
SCANS = os.path.join(ROOT, 'tmp', 'b1863', 'maps', 'scans')
_f = Transformer.from_crs(4326, 32618, always_xy=True); _b = Transformer.from_crs(32618, 4326, always_xy=True)
def ll2en(lng, lat): return _f.transform(lng, lat)
def en2ll(e, n): return _b.transform(e, n)
def _aff(name):
    T = json.load(open(os.path.join(BASE, 'transforms', name + '.json')))
    return np.array(T['px_to_en']['A']), np.array(T['px_to_en']['t']), np.array(T['en_to_px']['A']), np.array(T['en_to_px']['t']), T
class Affine:
    def __init__(self, name):
        self.A, self.t, self.Ai, self.ti, self.T = _aff(name); self.name = name
    def px2ll(self, x, y):
        e, n = self.A @ np.array([x, y]) + self.t; return en2ll(e, n)
    def ll2px(self, lng, lat):
        e, n = ll2en(lng, lat); x, y = self.Ai @ np.array([e, n]) + self.ti; return float(x), float(y)
    def px2en(self, x, y): return tuple(self.A @ np.array([x, y]) + self.t)
WARREN = lambda: Affine('warren-1869'); HK_COUNTY = lambda: Affine('hopkins-1858-county'); HK_INSET = lambda: Affine('hopkins-1858-gettysburg-inset')
def sheet(letter):
    import common_tm
    return common_tm.SheetTransform(letter)
