"""Reader for the cached 3DEP float32 blocks: a windowed view over the block mosaic, so hillshade and contours are seamless across block edges."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import numpy as np
from PIL import Image


def fill_nan_nearest(a):
    """fill NaN by the nearest valid value along rows, then columns (only the thin outer ring ever needs it)"""
    if not np.isnan(a).any() or np.isnan(a).all():
        return a
    for axis in (1, 0, 1, 0):
        v = a if axis == 1 else a.T
        idx = np.where(~np.isnan(v), np.arange(v.shape[1])[None, :], 0)
        np.maximum.accumulate(idx, axis=1, out=idx)
        v2 = np.take_along_axis(v, idx, axis=1)
        v[:] = np.where(np.isnan(v), v2, v)
        # a leading run of NaN has idx 0 and takes column 0 (also NaN); the reversed pass below fixes that
        v = v[:, ::-1]
        idx = np.where(~np.isnan(v), np.arange(v.shape[1])[None, :], 0)
        np.maximum.accumulate(idx, axis=1, out=idx)
        v3 = np.take_along_axis(v, idx, axis=1)
        v[:] = np.where(np.isnan(v), v3, v)
    return a


class DemMosaic:
    """blocks of 512*2^(zg-bz) px square at grid zoom zg (block zoom bz); the global pixel grid is the world grid of zoom zg: pixel (X, Y) is world pixel (X, Y) at zoom zg"""

    def __init__(self, zg, bz, subdir=None):
        self.zg, self.bz = zg, bz
        self.px = TILE * 2 ** (zg - bz)
        self.cache = {}
        self.dir = os.path.join(CACHE, 'dem', subdir or f'z{zg}')

    def block(self, bx, by):
        k = (bx, by)
        if k not in self.cache:
            p = os.path.join(self.dir, f'b{self.bz}_{bx}_{by}.tif')
            self.cache[k] = np.asarray(Image.open(p), dtype=np.float32) if os.path.exists(p) else None
            if len(self.cache) > 12:
                self.cache.pop(next(iter(self.cache)))
        return self.cache[k]

    def window(self, X0, Y0, w, h):
        out = np.full((h, w), np.nan, np.float32)
        P = self.px
        for by in range(Y0 // P, (Y0 + h - 1) // P + 1):
            for bx in range(X0 // P, (X0 + w - 1) // P + 1):
                b = self.block(bx, by)
                if b is None:
                    continue
                x0, x1 = max(X0, bx * P), min(X0 + w, (bx + 1) * P)
                y0, y1 = max(Y0, by * P), min(Y0 + h, (by + 1) * P)
                out[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = b[y0 - by * P:y1 - by * P, x0 - bx * P:x1 - bx * P]
        return fill_nan_nearest(out)
