"""Stage 40: Web Mercator tile pyramid of the reconstruction, plus the provenance mask tiles and the manifest.

Tile convention: Mapbox GL style, 512 x 512 px tiles. Tile (z, x, y) is the standard slippy-map index (same x, y as a 256 px tile at z) covering the same ground as 4 tiles of 256 px at z+1;
world size at zoom z is 512 * 2^z px, so the zoom number equals the camera zoom of a Mapbox GL map (tileSize 512). Ground sample distance at latitude 39.8: z16 0.92 m, z15 1.84 m, z17 0.46 m.
The source photograph is 1.0 m (NAIP 2013-06-04): z16 is the native level, z17 is an enlargement (no new detail), nothing finer is made.
Coverage: z11-z15 the whole data box; z16 the Warren-sheet coverage plus 500 m; z17 within 650 m of five named hotspots.
Format: WebP (lossy, quality by level), written to docs/basemap1863/tiles/{z}/{x}/{y}.webp. Provenance mask tiles (PNG, class codes) to docs/basemap1863/PROVENANCE-LAYER/tiles/{z}/{x}/{y}.png.
"""
import sys, os, json, math, time, hashlib, io, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from multiprocessing import Pool
from PIL import Image
from pyproj import Transformer

SRC = os.environ.get('B1863_FINAL', os.path.join(C.BUILD, 'stage35.u8'))
PROVF = os.path.join(C.BUILD, 'prov.u8')
T = 512
QUAL = {11: 80, 12: 80, 13: 80, 14: 79, 15: 76, 16: 72, 17: 70}
_tr = Transformer.from_crs('EPSG:3857', C.CRS, always_xy=True)
BOX = (-77.34375, 39.75788, -77.14600, 39.87602)
SHEETS = {}

def merc_bounds(z, x, y):
    size = 2 * 20037508.342789244
    n = 2 ** z
    x0 = -20037508.342789244 + x * size / n; x1 = x0 + size / n
    y1 = 20037508.342789244 - y * size / n; y0 = y1 - size / n
    return x0, y0, x1, y1

def tile_xy(lon, lat, z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y

def levels():
    """list of (z, x, y)"""
    out = []
    x0, y0 = tile_xy(BOX[0], BOX[3], 0)
    for z in range(11, 16):
        xa, ya = tile_xy(BOX[0], BOX[3], z); xb, yb = tile_xy(BOX[2], BOX[1], z)
        for x in range(int(xa), int(xb) + 1):
            for y in range(int(ya), int(yb) + 1):
                out.append((z, x, y))
    # z16: tiles whose ground touches the sheet coverage grown by 500 m
    import rasterio
    with rasterio.open(os.path.join(C.BUILD, 'lc1863.tif')) as d:
        lc = d.read(1, out_shape=(C.H // 16, C.W // 16)) > 0
    cov = cv2.dilate(lc.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (63, 63))) > 0       # 16 m cells: 63 cells = 500 m each side
    xa, ya = tile_xy(BOX[0], BOX[3], 16); xb, yb = tile_xy(BOX[2], BOX[1], 16)
    for x in range(int(xa), int(xb) + 1):
        for y in range(int(ya), int(yb) + 1):
            xs, ys, xe, ye = merc_bounds(16, x, y)
            ex, ny = _tr.transform([xs, xe, xs, xe, (xs + xe) / 2], [ys, ys, ye, ye, (ys + ye) / 2])
            cs = (np.array(ex) - C.X0) / 16; rs = (C.Y0 - np.array(ny)) / 16
            hit = False
            for c_, r_ in zip(cs, rs):
                ci, ri = int(c_), int(r_)
                if 0 <= ci < cov.shape[1] and 0 <= ri < cov.shape[0] and cov[ri, ci]:
                    hit = True; break
            if hit:
                out.append((16, x, y))
    # z17 around the hotspots
    from common import HOTSPOTS
    HOT17 = dict(HOTSPOTS); HOT17.update({'devils_den': (-77.2435, 39.7911), 'culps_hill': (-77.2194, 39.8156), 'cemetery_hill': (-77.2306, 39.8204), 'seminary_ridge': (-77.2437, 39.8333), 'big_round_top': (-77.2358, 39.7867)})
    seen = set()
    for name, (lo, la) in HOT17.items():
        for dlon, dlat in [(dx, dy) for dx in (-0.008, -0.004, 0, 0.004, 0.008) for dy in (-0.006, -0.003, 0, 0.003, 0.006)]:
            x, y = tile_xy(lo + dlon, la + dlat, 17)
            t = (17, int(x), int(y))
            if t in seen:
                continue
            # keep tiles whose centre is within 650 m of the hotspot
            xs, ys, xe, ye = merc_bounds(17, int(x), int(y))
            ex, ny = _tr.transform((xs + xe) / 2, (ys + ye) / 2)
            hx, hy = C.ll2utm(lo, la)
            if math.hypot(ex - hx, ny - hy) <= 650:
                seen.add(t)
    out += sorted(seen)
    return sorted(set(out))

_g = {}
def _init():
    C.lowprio()
    img = np.memmap(SRC, dtype=np.uint8, mode='r', shape=(C.H, C.W, 3))
    _g['lv'] = {1: np.ascontiguousarray(img)}
    f = 1
    cur = _g['lv'][1]
    for k in (2, 4, 8, 16, 32):
        cur = cv2.resize(cur if k == 2 else _g['lv'][k // 2], (C.W // k, C.H // k), interpolation=cv2.INTER_AREA)
        _g['lv'][k] = cur
    _g['prov'] = np.memmap(PROVF, dtype=np.uint8, mode='r', shape=(C.H, C.W))

def _maps(z, x, y, k):
    xs, ys, xe, ye = merc_bounds(z, x, y)
    px = (np.arange(T) + 0.5) / T
    mx = xs + px * (xe - xs); my = ye - px * (ye - ys)
    MX, MY = np.meshgrid(mx, my)
    E, N = _tr.transform(MX, MY)
    col = (E - C.X0) / k - 0.5; row = (C.Y0 - N) / k - 0.5
    return col.astype(np.float32), row.astype(np.float32)

def make(job):
    z, x, y = job
    gsd = (40075016.686 / (T * 2 ** z)) * math.cos(math.radians(39.8))
    k = 1
    for kk in (2, 4, 8, 16, 32):
        if gsd >= 1.6 * kk / 1.0 * 0.62 and gsd > kk * 0.95:
            k = kk
    # source level: the coarsest level that is still finer than the tile (ground sample distance / level >= 1)
    k = 1
    for kk in (2, 4, 8, 16, 32):
        if kk <= gsd * 1.05:
            k = kk
    col, row = _maps(z, x, y, k)
    src = _g['lv'][k]
    interp = cv2.INTER_LANCZOS4 if gsd <= 1.2 * k else cv2.INTER_CUBIC
    if z >= 17:
        interp = cv2.INTER_CUBIC
    im = cv2.remap(src, col, row, interp, borderMode=cv2.BORDER_REPLICATE)
    buf = io.BytesIO()
    Image.fromarray(im).save(buf, 'WEBP', quality=QUAL[z], method=6)
    data = buf.getvalue()
    d = os.path.join(C.TILES, str(z), str(x)); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, '%d.webp' % y), 'wb') as f:
        f.write(data)
    out = dict(z=z, x=x, y=y, bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    if z >= 13:
        c1, r1 = _maps(z, x, y, 1)
        pm = cv2.remap(_g['prov'], c1, r1, cv2.INTER_NEAREST, borderMode=cv2.BORDER_REPLICATE)
        pi = Image.fromarray(pm, 'P')
        pal = np.zeros(768, np.uint8)
        from s39_final import NAMES
        import s39_final as F
        for code, rgb in PALETTE.items():
            pal[code * 3:code * 3 + 3] = rgb
        pi.putpalette(pal.tolist())
        pd = os.path.join(C.PROV, 'tiles', str(z), str(x)); os.makedirs(pd, exist_ok=True)
        b2 = io.BytesIO(); pi.save(b2, 'PNG', optimize=True)
        with open(os.path.join(pd, '%d.png' % y), 'wb') as f:
            f.write(b2.getvalue())
        out['prov_bytes'] = len(b2.getvalue())
    return out

PALETTE = {0: (0, 0, 0), 22: (60, 60, 60), 1: (255, 0, 255), 2: (200, 0, 160), 3: (255, 128, 0), 4: (0, 180, 0), 5: (150, 100, 200), 6: (255, 230, 0), 7: (255, 160, 0), 8: (0, 200, 255),
           9: (160, 120, 60), 10: (255, 60, 60), 11: (120, 255, 120), 12: (255, 200, 0), 13: (230, 60, 120), 14: (0, 255, 200), 20: (120, 120, 255), 21: (0, 120, 255)}

def main():
    C.lowprio()
    t0 = time.time()
    import shutil
    for base in (C.TILES, os.path.join(C.PROV, 'tiles')):
        for z in range(0, 23):
            d = os.path.join(base, str(z))
            if os.path.isdir(d):
                shutil.rmtree(d)           # no stale tiles from earlier builds
    jobs = levels()
    print('tiles', len(jobs), {z: sum(1 for j in jobs if j[0] == z) for z in range(11, 18)}, flush=True)
    if len(sys.argv) > 1 and sys.argv[1].startswith('only'):
        zs = [int(v) for v in sys.argv[1][4:].split(',')]
        jobs = [j for j in jobs if j[0] in zs]
    res = []
    with Pool(C.THREADS, initializer=_init) as pool:
        for i, r in enumerate(pool.imap_unordered(make, jobs, chunksize=4)):
            res.append(r)
            if i % 200 == 0:
                print(i, 'elapsed %.0f' % (time.time() - t0), flush=True)
    res.sort(key=lambda r: (r['z'], r['x'], r['y']))
    tot = sum(r['bytes'] for r in res)
    by = {}
    for r in res:
        by.setdefault(r['z'], [0, 0]); by[r['z']][0] += 1; by[r['z']][1] += r['bytes']
    print('total tile MB %.2f' % (tot / 1e6), {z: (n, round(b / 1e6, 2)) for z, (n, b) in by.items()}, 'prov MB %.2f' % (sum(r.get('prov_bytes', 0) for r in res) / 1e6))
    json.dump(res, open(os.path.join(C.BUILD, 'tiles_index.json'), 'w'))

if __name__ == '__main__':
    main()
