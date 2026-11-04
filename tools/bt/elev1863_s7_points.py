"""Stage 7: sample the modern 3DEP surface along every extracted contour fragment, in BOTH Warren frames, and classify terrain.

Terrain classes come from the MODERN DEM (they describe the ground, not Warren's level):
  hilltop      TPI150 >= +3 m            (topographic position: DEM minus mean DEM in a 150 m radius)
  stream       within 20 m of an NHD flowline and TPI150 <= -1.5 m
  valley_floor TPI150 <= -3 m and slope <= 8 degrees (not stream)
  slope        slope >= 3 degrees (remaining)
  flat         remaining
Writes tmp/bt/elev1863/points.npz and class_raster.npy (4 m grid) and frag_table.pkl
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s7_points.py
"""
import os
import sys
import json
import pickle
import collections
import numpy as np
import rasterio
from scipy import ndimage as ndi
from scipy.ndimage import map_coordinates
import shapely.geometry as sg
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import elev1863_s5_levels as S5

CLASSES = ['flat', 'slope', 'valley_floor', 'stream', 'hilltop']


def terrain_classes(dem, f=4):
    H = (dem.shape[0] // f) * f
    W = (dem.shape[1] // f) * f
    d4 = dem[:H, :W].reshape(H // f, f, W // f, f).mean((1, 3)).astype(np.float32)
    d4 = np.nan_to_num(d4, nan=float(np.nanmean(d4)))
    sm = ndi.gaussian_filter(d4, 1.0)
    gy, gx = np.gradient(sm, f)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    r = 150 // f
    yy, xx = np.ogrid[-r:r + 1, -r:r + 1]
    disk = (yy ** 2 + xx ** 2 <= r * r).astype(np.float32)
    disk /= disk.sum()
    tpi = d4 - ndi.convolve(d4, disk, mode='nearest')
    # NHD flowlines within 20 m
    g = json.load(open(os.path.join(C.ROOT, 'tmp', 'b1863', 'maps', 'ref', 'nhd_flowline.geojson')))
    mask = np.zeros(d4.shape, np.uint8)
    import cv2
    for ft in g['features']:
        geom = ft['geometry']
        lines = [geom['coordinates']] if geom['type'] == 'LineString' else geom['coordinates']
        for ln in lines:
            a = np.array(ln)[:, :2]
            px = ((a[:, 0] - C.DEM_X0) / f).astype(np.int32)
            py = ((C.DEM_Y0 - a[:, 1]) / f).astype(np.int32)
            cv2.polylines(mask, [np.stack([px, py], 1).reshape(-1, 1, 2)], False, 1, 1)
    near = ndi.distance_transform_edt(mask == 0) * f <= 20
    cls = np.zeros(d4.shape, np.uint8)
    cls[slope >= 3] = 1
    cls[(tpi <= -3) & (slope <= 8)] = 2
    cls[near & (tpi <= -1.5)] = 3
    cls[tpi >= 3] = 4
    return cls, slope, tpi, f


def main():
    frags = S5.load_fragments()
    n = len(frags)
    dem = rasterio.open(C.DEM).read(1)
    cls, slope, tpi, f = terrain_classes(dem)
    np.save(os.path.join(C.CACHE, 'class_raster.npy'), cls)
    np.save(os.path.join(C.CACHE, 'slope4.npy'), slope.astype(np.float16))
    print('class shares', {CLASSES[i]: float((cls == i).mean()) for i in range(5)})
    fr = {k: C.load_frame(k)[0] for k in ('affine', 'ffd')}
    rec = collections.defaultdict(list)
    for i, c in enumerate(frags):
        p = c['pts'][::4]
        if len(p) < 3:
            continue
        rec['frag'].append(np.full(len(p), i, np.int32))
        rec['px'].append(p[:, 0])
        rec['py'].append(p[:, 1])
        for k, fn in fr.items():
            E, N = fn(p[:, 0], p[:, 1])
            rec['E_' + k].append(E)
            rec['N_' + k].append(N)
            rec['dem_' + k].append(map_coordinates(dem, [C.DEM_Y0 - N - 0.5, E - C.DEM_X0 - 0.5], order=1, mode='nearest'))
            rec['cls_' + k].append(cls[np.clip(((C.DEM_Y0 - N) / f).astype(int), 0, cls.shape[0] - 1), np.clip(((E - C.DEM_X0) / f).astype(int), 0, cls.shape[1] - 1)])
            rec['slope_' + k].append(slope[np.clip(((C.DEM_Y0 - N) / f).astype(int), 0, cls.shape[0] - 1), np.clip(((E - C.DEM_X0) / f).astype(int), 0, cls.shape[1] - 1)])
    arr = {k: np.concatenate(v) for k, v in rec.items()}
    np.savez_compressed(os.path.join(C.CACHE, 'points.npz'), **arr)
    print('points', len(arr['frag']))


if __name__ == '__main__':
    main()
