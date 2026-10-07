"""Cut the NAIP blocks into the 512-px tile pyramid and encode every candidate tile (AVIF) into tmp/look-dev/basemap/build/aerial/<z>/<x>_<y>.avif.
Every tile is stored with a GUTTER: (512 + 2*G) px square, the centre 512 px are the tile, the G px all round are the real neighbouring pixels.  The loader draws the centre only and
bleeds into the gutter, so lossy-codec edge effects and fractional-pixel overdraw never show as seams (verify/seams.py checks it).
The size of every candidate goes to build/sizes-aerial.json; build-assets.py picks the tiles that fit the byte budget.
Usage: python build-aerial.py [--q 40] [--q-low 36] [--sharp 0.35]
 q       AVIF quality for z15..z17 ; q-low for z13, z14 ;  sharp: unsharp-mask amount applied after area-averaging (z<=15)"""
import io, json, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from terrain import box_down, smooth
from dem import fill_nan_nearest
import numpy as np
from PIL import Image

G = 4
arg = lambda n, d: type(d)(sys.argv[sys.argv.index(n) + 1]) if n in sys.argv else d
Q, QLOW, SHARP = arg('--q', 40), arg('--q-low', 36), arg('--sharp', 0.35)
BUILD = os.path.join(ROOT, 'tmp', 'look-dev', 'basemap', 'build')
os.makedirs(BUILD, exist_ok=True)


class NaipMosaic:
    """blocks of 512*2^(zg-bz) px at grid zoom zg; window() stitches any pixel rectangle of that grid (missing blocks are filled by the nearest present pixel)"""

    def __init__(self, zg, bz):
        self.zg, self.bz, self.px = zg, bz, TILE * 2 ** (zg - bz)
        self.dir = os.path.join(CACHE, 'naip', f'z{zg}')
        self.cache = {}

    def block(self, bx, by):
        k = (bx, by)
        if k not in self.cache:
            p = os.path.join(self.dir, f'b{self.bz}_{bx}_{by}.jpg')
            self.cache[k] = np.asarray(Image.open(p).convert('RGB'), dtype=np.float32) if os.path.exists(p) else None
            while len(self.cache) > 9:
                self.cache.pop(next(iter(self.cache)))
        return self.cache[k]

    def window(self, X0, Y0, w, h):
        out = np.full((h, w, 3), np.nan, np.float32)
        P = self.px
        for by in range(Y0 // P, (Y0 + h - 1) // P + 1):
            for bx in range(X0 // P, (X0 + w - 1) // P + 1):
                b = self.block(bx, by)
                if b is None:
                    continue
                x0, x1 = max(X0, bx * P), min(X0 + w, (bx + 1) * P)
                y0, y1 = max(Y0, by * P), min(Y0 + h, (by + 1) * P)
                out[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = b[y0 - by * P:y1 - by * P, x0 - bx * P:x1 - bx * P]
        if np.isnan(out).any():
            if np.isnan(out).all():
                return None
            for c in range(3):
                out[..., c] = fill_nan_nearest(out[..., c])
        return out


def sharpen(a, amt):
    if amt <= 0:
        return a
    return np.clip(a + amt * (a - np.stack([smooth(a[..., c], 0.8) for c in range(3)], axis=-1)), 0, 255)


def save(z, x, y, arr, q):
    out = os.path.join(BUILD, 'aerial', str(z), f'{x}_{y}.avif')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img = Image.fromarray(np.clip(arr + 0.5, 0, 255).astype(np.uint8))
    b = io.BytesIO()
    img.save(b, 'AVIF', quality=q, speed=6)
    open(out, 'wb').write(b.getvalue())
    return b.tell()


def tile_at(mos, z, x, y):
    """padded tile (512+2G)^2 of zoom z (z <= the mosaic's grid zoom) from the mosaic: window at the grid, box-averaged by k"""
    k = 2 ** (mos.zg - z)
    X0, Y0 = (x * 512 - G) * k, (y * 512 - G) * k
    w = (512 + 2 * G) * k
    a = mos.window(X0, Y0, w, w)
    if a is None:
        return None
    a = box_down(a, k)
    return sharpen(a, SHARP) if z <= 15 else a


if __name__ == '__main__':
    tiers = json.load(open(os.path.join(os.path.dirname(__file__), 'tiers.json')))
    sizes = {}
    t0 = time.time()
    m16, m17 = NaipMosaic(16, 14), NaipMosaic(17, 15)
    todo = [(13, x, y) for x, y, _ in tiers['z13']] + [(14, x, y) for x, y, _ in tiers['z14']] + [(15, x, y) for x, y, _ in tiers['z15']] + \
           [(16, x, y) for x, y, _ in tiers['z16']] + [(17, x, y) for x, y, _ in tiers['z17']]
    todo.sort(key=lambda t: (t[0], t[2], t[1]))
    for i, (z, x, y) in enumerate(todo):
        mos = m17 if z == 17 else m16
        if z == 17 and not os.path.exists(os.path.join(m17.dir, f'b15_{x >> 2}_{y >> 2}.jpg')):
            continue
        a = tile_at(mos, z, x, y)
        if a is None:
            continue
        sizes[f'{z}/{x}_{y}'] = save(z, x, y, a, QLOW if z <= 14 else Q)
        if i % 100 == 0:
            print(f'{i}/{len(todo)}  z{z}  {time.time() - t0:.0f}s', flush=True)
    json.dump(sizes, open(os.path.join(BUILD, 'sizes-aerial.json'), 'w'))
    by = {}
    for k, v in sizes.items():
        by.setdefault(k.split('/')[0], []).append(v)
    print({z: (len(v), round(sum(v) / 1e6, 2), 'MB', round(sum(v) / len(v) / 1024, 1), 'KB avg') for z, v in sorted(by.items())})
