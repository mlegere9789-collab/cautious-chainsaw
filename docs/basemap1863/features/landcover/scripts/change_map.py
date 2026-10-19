"""Change layers between modern canopy (lidar 2017) and the 1863 reconstructed tree cover (Warren-derived)."""
import numpy as np, cv2, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from shapely.geometry import Polygon, MultiPolygon, box
from shapely.ops import unary_union
from shapely import wkt
from rasterize import rasterize, X0, Y1
R = 2.0
d = np.load('chm_final.npz'); chm = d['chm']; mf = d['mf']
canopy = ((chm > 4.0) & (mf > 0.08)).astype(np.uint8)
canopy = cv2.morphologyEx(canopy, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
canopy = cv2.morphologyEx(canopy, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
def vectorize(mask, minarea_m2, tol=2.0):
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hier is None: return []
    hier = hier[0]; polys = {}
    for i, c in enumerate(cs):
        if hier[i][3] == -1 and cv2.contourArea(c) * R * R >= minarea_m2 and len(c) >= 4:
            pts = [(X0 + (x + 0.5) * R, Y1 - (y + 0.5) * R) for x, y in c[:, 0, :]]
            polys[i] = (pts, [])
    for i, c in enumerate(cs):
        p = hier[i][3]
        if p != -1 and p in polys and cv2.contourArea(c) * R * R >= 200 and len(c) >= 4:
            polys[p][1].append([(X0 + (x + 0.5) * R, Y1 - (y + 0.5) * R) for x, y in c[:, 0, :]])
    out = []
    for pts, holes in polys.values():
        g = Polygon(pts, holes).buffer(0).simplify(tol, preserve_topology=True)
        if not g.is_empty: out.append(g)
    return out
