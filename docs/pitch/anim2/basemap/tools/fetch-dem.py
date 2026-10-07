"""Download the USGS 3DEP bare-earth DEM (public domain; the service serves the best available source, 1 m lidar-derived in Adams County PA) as float32 GeoTIFF blocks
aligned to the 512-px tile grid.  Usage: python fetch-dem.py ZGRID BLOCKZ [--tiles-file f.json]   (15 14 -> a z14 tile as 1024x1024 at the z15 grid)"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
DEM = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage'
def block_path(zg, bz, tx, ty): return f'dem/z{zg}/b{bz}_{tx}_{ty}.tif'
def fetch_block(zg, bz, tx, ty):
    px = TILE * 2 ** (zg - bz)
    b = tile_bounds_merc(bz, tx, ty)
    return polite_get(DEM, dict(bbox='%.6f,%.6f,%.6f,%.6f' % b, bboxSR=3857, imageSR=3857, size=f'{px},{px}', format='tiff', pixelType='F32', interpolation='RSP_BilinearInterpolation', f='image'),
                      cache_key=block_path(zg, bz, tx, ty), min_interval=1.5)
if __name__ == '__main__':
    zg, bz = int(sys.argv[1]), int(sys.argv[2])
    plan = json.load(open(os.path.join(BASEMAP, 'plan.json'))); r = plan['z14Range']
    if '--tiles-file' in sys.argv: lst = [tuple(t) for t in json.load(open(sys.argv[sys.argv.index('--tiles-file') + 1]))]
    else:
        assert bz == 14; lst = [(x, y) for y in range(r['y0'], r['y1'] + 1) for x in range(r['x0'], r['x1'] + 1)]
    for i, (tx, ty) in enumerate(lst):
        p = os.path.join(CACHE, block_path(zg, bz, tx, ty))
        if os.path.exists(p): continue
        t0 = time.time(); fetch_block(zg, bz, tx, ty)
        print(f'{i + 1}/{len(lst)} z{bz} {tx},{ty}  {os.path.getsize(p) / 1e6:.2f} MB  {time.time() - t0:.0f}s', flush=True)
    print('done', flush=True)
