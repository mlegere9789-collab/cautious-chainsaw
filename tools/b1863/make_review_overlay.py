"""Review overlay for the 1858 street plan: the Hopkins inset (source scan) with the drawn town streets (green) and the extracted building symbols (red outlines).
Saved as docs/basemap1863/PROVENANCE-LAYER/checks/review_street_overlay.jpg for the by-eye review that decides which modern streets are drawn."""
import sys, os, pickle, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C, s33_hopkins as H, rasterio
from rasterio.windows import Window
from PIL import Image
ds = rasterio.open(H.SCAN)
c, r = H.en2px([H.CX, H.CY]); S = 2300
c0 = max(int(c - S // 2), 0); r0 = max(int(r - S // 2), 0)
a = np.moveaxis(ds.read(window=Window(c0, r0, S, S)), 0, -1).copy()
for q in pickle.load(open(os.path.join(C.BUILD, 'hopkins_town_streets.pkl'), 'rb')):
    g = q['geom']
    for ls in (g.geoms if hasattr(g, 'geoms') else [g]):
        if ls.geom_type != 'LineString': continue
        px = H.en2px(np.array(ls.coords)) - np.array([c0, r0])
        cv2.polylines(a, [px.astype(np.int32)], False, (0, 170, 0), 4)
for g in pickle.load(open(os.path.join(C.BUILD, 'hopkins_buildings.pkl'), 'rb')):
    px = H.en2px(np.array(g.exterior.coords)) - np.array([c0, r0])
    cv2.polylines(a, [px.astype(np.int32)], True, (220, 0, 0), 2)
os.makedirs(os.path.join(C.PROV, 'checks'), exist_ok=True)
Image.fromarray(a).resize((1500, 1500), Image.LANCZOS).save(os.path.join(C.PROV, 'checks', 'review_street_overlay.jpg'), quality=82)
print('saved')
