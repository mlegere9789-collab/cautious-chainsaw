"""Shared helpers for the troop-map georeferencing: reuse docs/basemap1863 transforms (Warren px -> ground, Bachelder scan <-> Warren px)."""
import os, sys, json, numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'docs', 'basemap1863', 'maps', 'tools'))
import georef
BASE = os.path.join(ROOT, 'docs', 'basemap1863', 'maps')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'terrain', 'troopmaps')
TMP = os.path.join(ROOT, 'tmp', 'troopmaps')
SHEETS = {'a': 'bachelder-1876-sheet1', 'b': 'bachelder-1876-sheet2', 'c': 'bachelder-1876-sheet3'}
def warren():
    T = json.load(open(os.path.join(BASE, 'transforms', 'warren-1869.json')))
    return T
def warren_gcps():
    d, px, en, g = georef.load_gcps(os.path.join(BASE, 'gcps', 'warren.json'))
    return px, en, g
class SheetTransform:
    """scan px (full-res LOC service JP2 of the sheet) -> UTM18N E,N via the committed chain: TPS scan->Warren px, then Warren affine."""
    def __init__(self, sheet):
        self.sheet = sheet
        T = json.load(open(os.path.join(BASE, 'transforms', SHEETS[sheet] + '.json'))); self.T = T
        cp = T['control_pairs']; a = np.array(cp['scan_px']); r = np.array(cp['warren_px'])
        kind = 'tps' if len(a) >= 40 else 'affine'
        self.fwd = georef.Model(kind, cp['smoothing']).fit(a, r)   # scan -> warren px
        self.inv = georef.Model(kind, cp['smoothing']).fit(r, a)   # warren px -> scan
        W = T['warren_px_to_en']; self.A = np.array(W['A']); self.t = np.array(W['t'])
    def scan_to_en(self, p):
        r = self.fwd(p); return (self.A @ np.atleast_2d(r).T).T + self.t
    def en_to_scan(self, en):
        en = np.atleast_2d(en); r = (np.linalg.inv(self.A) @ (en - self.t).T).T; return self.inv(r)
    def warren_to_scan(self, r): return self.inv(np.atleast_2d(r))
