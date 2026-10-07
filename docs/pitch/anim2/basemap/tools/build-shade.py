"""Hillshade tiles from the 3DEP DEM -> tmp/look-dev/basemap/build/shade/<z>/<x>_<y>.avif
Grayscale, 128 = flat; composited with soft-light at run time.  Lit from about 165 deg (the sun of the NAIP photo, measured: README) with a multi-directional blend.
Same gutter as the aerial tiles: (512 + 2G) px square.  z13..z15 come from the whole-bbox DEM at the z15 grid, z16 from the z16-grid DEM blocks where those were fetched.
Usage: python build-shade.py [--q 35]"""
import io, json, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from terrain import *
from dem import DemMosaic
import numpy as np
from PIL import Image

G = 4
HALO = 24
arg = lambda n, d: type(d)(sys.argv[sys.argv.index(n) + 1]) if n in sys.argv else d
Q = arg('--q', 35)
BUILD = os.path.join(ROOT, 'tmp', 'look-dev', 'basemap', 'build')
os.makedirs(BUILD, exist_ok=True)
LAT = 39.81


def CELL(z):
    return mpp(z) * np.cos(np.radians(LAT))


# per-level look of the relief: (gaussian sigma in px of that level's grid, vertical exaggeration, gain around neutral)
PARAM = {16: (1.3, 3.0, 1.6), 15: (1.2, 3.6, 1.7), 14: (1.2, 4.5, 1.8), 13: (1.2, 6.0, 1.9)}


def shade_from(dem, z):
    sig, zf, gain = PARAM[z]
    d = smooth(dem, sig)
    hs, flat = hillshade(d, CELL(z), zf, azimuths=(135, 165, 195), weights=(1.0, 2.0, 1.0), altitude=38.0)
    return np.clip(0.5 + (hs - flat) * gain, 0, 1)


def save(z, x, y, g):
    out = os.path.join(BUILD, 'shade', str(z), f'{x}_{y}.avif')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img = Image.fromarray((g * 255 + 0.5).astype(np.uint8), 'L')
    b = io.BytesIO()
    img.save(b, 'AVIF', quality=Q, speed=6)
    open(out, 'wb').write(b.getvalue())
    return b.tell()


if __name__ == '__main__':
    tiers = json.load(open(os.path.join(os.path.dirname(__file__), 'tiers.json')))
    sizes = {}
    t0 = time.time()
    m15, m16 = DemMosaic(15, 14), DemMosaic(16, 15)
    todo = [(13, x, y) for x, y, _ in tiers['z13']] + [(14, x, y) for x, y, _ in tiers['z14']] + [(15, x, y) for x, y, _ in tiers['z15']] + [(16, x, y) for x, y, _ in tiers['z16']]
    todo.sort(key=lambda t: (t[0], t[2], t[1]))
    P = 512 + 2 * G
    for i, (z, x, y) in enumerate(todo):
        if z == 16:
            if not os.path.exists(os.path.join(m16.dir, f'b15_{x >> 1}_{y >> 1}.tif')):
                continue
            dem = m16.window(x * 512 - G - HALO, y * 512 - G - HALO, P + 2 * HALO, P + 2 * HALO)
            if np.isnan(dem).all():
                continue
            g = shade_from(dem, 16)
        else:
            k = 2 ** (15 - z) if z <= 15 else 1                       # z15 grid pixels per pixel of this level (z13: 4, z14: 2, z15: 1)
            h = HALO if z == 15 else max(8, HALO // k)
            side = (P + 2 * h) * k
            dem = m15.window((x * 512 - G - h) * k, (y * 512 - G - h) * k, side, side)
            if np.isnan(dem).all():
                continue
            dem = box_down(dem, k)
            g = shade_from(dem, z)
            HALO_Z = h
            g = g[HALO_Z:-HALO_Z, HALO_Z:-HALO_Z]
            sizes[f'{z}/{x}_{y}'] = save(z, x, y, g)
            if i % 60 == 0:
                print(f'{i}/{len(todo)} z{z} {time.time() - t0:.0f}s', flush=True)
            continue
        g = g[HALO:-HALO, HALO:-HALO]
        sizes[f'{z}/{x}_{y}'] = save(z, x, y, g)
    json.dump(sizes, open(os.path.join(BUILD, 'sizes-shade.json'), 'w'))
    by = {}
    for k, v in sizes.items():
        by.setdefault(k.split('/')[0], []).append(v)
    print({z: (len(v), round(sum(v) / 1e6, 2), 'MB', round(sum(v) / len(v) / 1024, 1), 'KB avg') for z, v in sorted(by.items())})
