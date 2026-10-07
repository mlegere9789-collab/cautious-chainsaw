"""Download USGS NAIP Plus (NAIP 24 April to 10 May 2022, 0.6 m, public domain; three flight dates meet in the box, see README) as aligned blocks of the 512-px tile grid, RGB, JPEG q95.
Usage: python fetch-naip.py ZGRID [--part i/n] [--tiles-file f.json]
  ZGRID  the grid resolution of the request: 16 -> 0.917 m/px (a z14 tile is one 2048x2048 block), 17 -> 0.459 m/px (a z15 tile is one 2048x2048 block)
Blocks are cached under tmp/look-dev/basemap/cache/naip/z<ZGRID>/ ; re-running only fetches what is missing. One request at a time per process, 1.5 s pause."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
NAIP = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage'
def block_path(zg, bz, tx, ty): return f'naip/z{zg}/b{bz}_{tx}_{ty}.jpg'
def fetch_block(zg, bz, tx, ty):
    """a block = tile (tx,ty) of zoom bz (14 for zg 16, 15 for zg 17) at the resolution of grid zg: 512 * 2^(zg-bz) px square"""
    px = TILE * 2 ** (zg - bz)
    b = tile_bounds_merc(bz, tx, ty)
    return polite_get(NAIP, dict(bbox='%.6f,%.6f,%.6f,%.6f' % b, bboxSR=3857, imageSR=3857, size=f'{px},{px}', format='jpg', compressionQuality=95, pixelType='U8',
                                 interpolation='RSP_BilinearInterpolation', renderingRule='{"rasterFunction":"None"}', f='image'), cache_key=block_path(zg, bz, tx, ty), min_interval=1.5)
if __name__ == '__main__':
    zg = int(sys.argv[1]); bz = zg - 2
    part, nparts = 0, 1
    if '--part' in sys.argv: part, nparts = map(int, sys.argv[sys.argv.index('--part') + 1].split('/'))
    plan = json.load(open(os.path.join(BASEMAP, 'plan.json')))
    if '--tiles-file' in sys.argv: lst = [tuple(t) for t in json.load(open(sys.argv[sys.argv.index('--tiles-file') + 1]))]
    else:
        r = plan['z14Range']; lst = [(x, y) for y in range(r['y0'], r['y1'] + 1) for x in range(r['x0'], r['x1'] + 1)]
    lst = lst[part::nparts]
    for i, (tx, ty) in enumerate(lst):
        p = os.path.join(CACHE, block_path(zg, bz, tx, ty))
        if os.path.exists(p): continue
        t0 = time.time(); fetch_block(zg, bz, tx, ty)
        print(f'[{part}] {i + 1}/{len(lst)} z{bz} {tx},{ty}  {os.path.getsize(p) / 1e6:.2f} MB  {time.time() - t0:.0f}s', flush=True)
    print('done', part, flush=True)
