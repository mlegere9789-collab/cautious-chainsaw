"""Shared grid, paths and helpers for the 1863 reconstruction pipeline (tools/b1863).

Grid: EPSG:26918 (UTM 18N), 1.0 m pixels, origin upper-left (299220, 4416660), 17280 x 13620 px.
It is the grid of the chosen NAIP 2013-06-04 mosaic and of the modern removal mask, so every layer lines up pixel for pixel.
Heavy jobs: call lowprio() at the start (below-normal priority); never more than 4 threads (THREADS).
"""
import os, sys, json, math
THREADS = 4
os.environ.setdefault('OMP_NUM_THREADS', str(THREADS)); os.environ.setdefault('OPENBLAS_NUM_THREADS', str(THREADS))
os.environ.setdefault('MKL_NUM_THREADS', str(THREADS)); os.environ.setdefault('NUMEXPR_NUM_THREADS', str(THREADS))
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOCS = os.path.join(ROOT, 'docs', 'basemap1863')
FEAT = os.path.join(DOCS, 'features')
MOD = os.path.join(DOCS, 'modern')
TMPW = os.path.join(ROOT, 'tmp', 'b1863', 'modern', 'work')     # inputs from the modern layer (base mosaic, masks)
BUILD = os.path.join(ROOT, 'tmp', 'b1863', 'build')              # scratch for this pipeline (never committed)
TILES = os.path.join(DOCS, 'tiles')                              # committed tile pyramid
PROV = os.path.join(DOCS, 'PROVENANCE-LAYER')
os.makedirs(BUILD, exist_ok=True)

X0, Y0 = 299220.0, 4416660.0
W, H = 17280, 13620
CRS = 'EPSG:26918'
BASE_TIF = os.path.join(TMPW, 'naip2013_1.0m.tif')
MASK_TIF = os.path.join(TMPW, 'removal_mask_1m.tif')

# mask classes (modern/data/removal_mask_1m.json)
M_ROAD, M_BLDG, M_MON, M_UTIL, M_AREA, M_UNMAP, M_WATER = 1, 2, 3, 4, 5, 6, 7

def lowprio():
    try:
        import psutil
        psutil.Process().nice(psutil.BELOW_NORMAL_PRIORITY_CLASS if os.name == 'nt' else 10)
    except Exception:
        try:
            import ctypes
            ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
        except Exception:
            pass
    try:
        import cv2; cv2.setNumThreads(THREADS)
    except Exception:
        pass

from pyproj import Transformer
_t4326 = Transformer.from_crs('EPSG:4326', CRS, always_xy=True)
_tinv = Transformer.from_crs(CRS, 'EPSG:4326', always_xy=True)
def ll2utm(lon, lat): return _t4326.transform(lon, lat)
def utm2ll(x, y): return _tinv.transform(x, y)
def utm2px(x, y): return (np.asarray(x) - X0), (Y0 - np.asarray(y))      # (col, row) with pixel centres at +0.5
def px2utm(c, r): return X0 + np.asarray(c), Y0 - np.asarray(r)

def read_window(path, r0, r1, c0, c1, bands=None):
    import rasterio
    from rasterio.windows import Window
    with rasterio.open(path) as ds:
        return ds.read(bands, window=Window(c0, r0, c1 - c0, r1 - r0)) if bands else ds.read(window=Window(c0, r0, c1 - c0, r1 - r0))

def load_geojson(path):
    with open(path, encoding='utf-8') as f: return json.load(f)

def geom_to_utm(geom):
    from shapely.geometry import shape
    from shapely.ops import transform
    return transform(lambda x, y, z=None: _t4326.transform(x, y), shape(geom))

def rasterize(shapes, r0=0, r1=H, c0=0, c1=W, values=None, all_touched=False, dtype='uint8'):
    """shapes: list of shapely geometries in UTM; returns a (r1-r0, c1-c0) array (burn value 1 or values[i])"""
    from rasterio import features
    from rasterio.transform import Affine
    tr = Affine(1.0, 0, X0 + c0, 0, -1.0, Y0 - r0)
    if not shapes: return np.zeros((r1 - r0, c1 - c0), dtype)
    it = [(g, (values[i] if values is not None else 1)) for i, g in enumerate(shapes) if g is not None and not g.is_empty]
    return features.rasterize(it, out_shape=(r1 - r0, c1 - c0), transform=tr, fill=0, dtype=dtype, all_touched=all_touched)

# named hotspots (lon, lat) for visual checks; positions are read from the feature layers where possible, these are approximate map points
HOTSPOTS = {
    'peach_orchard': (-77.2527, 39.8001),
    'wheatfield': (-77.2425, 39.7957),
    'little_round_top': (-77.2371, 39.7915),
    'the_angle': (-77.2353, 39.8113),
    'town_centre': (-77.2311, 39.8309),
}
