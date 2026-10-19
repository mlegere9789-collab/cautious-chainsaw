"""Registration transform for Bachelder sheet 'a' used by the catalogue checks: b-maps affine (tf_bm1) + smooth displacement field fitted to the Warren GCPs and hand-read road lines
(fieldfit.py, lambda 3). Interface: ll2px, en2px, px2en, px2ll; the 50% render pixel frame of LOC cw0325000a (4146 x 5378)."""
import os, sys, json, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from georef import Affine
from fieldreg import Field
class FieldTF:
    def __init__(self, path=None, base=None):
        path = path or os.path.join(ROOT, 'tmp/b1863/roads/field_bm1.npz'); z = np.load(path)
        base = base or Affine(json.load(open(os.path.join(ROOT, 'tmp/b1863/roads/tf_bm1.json')))['M'])
        self.F = Field(base); self.F.dx = z['dx']; self.F.dy = z['dy']; self.base = base
        self.M = base.M          # affine part (for the tangent computation in checks)
    def en2px(self, E, N):
        return self.F.en2px(E, N)
    def ll2px(self, lng, lat):
        e, n = ll2m(lng, lat); return self.en2px(e, n)
    def px2en(self, x, y):
        E, N = self.base.px2m(x, y)
        for _ in range(8):
            px, py = self.en2px(E, N); ex, ey = x - px, y - py
            if abs(ex) + abs(ey) < 1e-3: break
            dE, dN = self.base.px2m(x + 0, y + 0)  # placeholder to keep API simple
            A = self.base.M[:, :2]; d = np.linalg.solve(A, np.array([ex, ey])); E += d[0]; N += d[1]
        return E, N
    def px2ll(self, x, y):
        return m2ll(*self.px2en(x, y))
    def jac_tangent(self, E, N, tx, ty):
        p = np.array(self.en2px(E, N)); q = np.array(self.en2px(E + tx * 5.0, N + ty * 5.0)); t = q - p; return t / np.linalg.norm(t)
