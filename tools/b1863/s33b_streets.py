"""Stage 33b: street plan of the borough in 1858, read from the Hopkins inset as FREE SPACE between the engraved block outlines.

The inset draws each block as a closed outline with its buildings; streets are the white corridors between outlines. After closing small gaps in the ink (lines, symbols, lettering),
the largest connected white region is the street system (plus the paper outside the plan); block interiors are separate small regions. The street system is cut to the built-up plan
(hull of the building symbols, 130 m buffer), cleaned, and vectorised through the inset's affine. Output tmp/b1863/build/hopkins_streets_poly.pkl (shapely, UTM).
"""
import sys, os, json, pickle, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import s33_hopkins as H
import rasterio
from rasterio.windows import Window
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
import warnings; warnings.filterwarnings('ignore')

def main():
    ds = rasterio.open(H.SCAN)
    c, r = H.en2px([H.CX, H.CY])
    S = int(2 * H.HALF / 0.41)
    c0 = max(int(c - S // 2), 0); r0 = max(int(r - S // 2), 0)
    a = ds.read(window=Window(c0, r0, min(S, ds.width - c0), min(S, ds.height - r0)))
    gray = a.mean(0).astype(np.uint8)
    ink = (gray < 150).astype(np.uint8)
    ink = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    ink = cv2.dilate(ink, np.ones((3, 3), np.uint8))
    free = (1 - ink).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(free, connectivity=4)
    areas = stats[:, cv2.CC_STAT_AREA]; areas[0] = 0
    # the largest region is the street system (and the paper beyond the plan)
    big = int(np.argmax(areas))
    streets = (lab == big)
    print('largest free component px', int(areas[big]), 'of', free.size)
    # plan region: the blocks are the closed white regions of plausible block size near the town centre; the plan is their union grown by 25 m
    blocks = np.zeros_like(free, bool)
    nb = 0
    cx, cy = (H.en2px([H.CX, H.CY]) - np.array([c0, r0]))
    for i in range(1, n):
        ar = stats[i, cv2.CC_STAT_AREA]
        if i == big or ar < 3000 or ar > 90000:
            continue
        x, y, w, h = stats[i, cv2.CC_STAT_LEFT], stats[i, cv2.CC_STAT_TOP], stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        if np.hypot(x + w / 2 - cx, y + h / 2 - cy) > 2300:
            continue
        # blocks are compact: bounding-box fill ratio high
        if ar / float(w * h) < 0.6:
            continue
        blocks |= (lab == i); nb += 1
    print('blocks', nb)
    plan = cv2.dilate(blocks.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (121, 121)))
    plan = cv2.morphologyEx(plan, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (201, 201)))
    st = streets & (plan > 0)
    # remove the area inside text/legend: components of the street mask smaller than 4000 px are dropped; fill pinholes (lettering inside the street)
    st = st.astype(np.uint8)
    st = cv2.morphologyEx(st, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    n2, lab2, stats2, _ = cv2.connectedComponentsWithStats(st, connectivity=8)
    keep = np.zeros_like(st)
    for i in range(1, n2):
        if stats2[i, cv2.CC_STAT_AREA] > 20000:
            keep[lab2 == i] = 1
    print('street px', int(keep.sum()), 'ha', float(keep.sum()) * 0.41 * 0.42 / 1e4)
    cv2.imwrite(os.path.join(C.BUILD, 'views', 'hop_streets_mask.png'), keep * 255)
    cs, hier = cv2.findContours(keep, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    polys = []
    hier = hier[0]
    for i, cnt in enumerate(cs):
        if hier[i][3] != -1:
            continue
        ap = cv2.approxPolyDP(cnt, 2.0, True)[:, 0, :].astype(float)
        if len(ap) < 3:
            continue
        holes = []
        j = hier[i][2]
        while j != -1:
            h = cv2.approxPolyDP(cs[j], 2.0, True)[:, 0, :].astype(float)
            if len(h) >= 3:
                holes.append(H.px2en(h + np.array([c0, r0])))
            j = hier[j][0]
        g = Polygon(H.px2en(ap + np.array([c0, r0])), holes)
        if not g.is_valid:
            g = g.buffer(0)
        if g.area > 300:
            polys.append(g)
    street_poly = unary_union(polys)
    print('street polygons', len(polys), 'area ha', street_poly.area / 1e4)
    pickle.dump(street_poly, open(os.path.join(C.BUILD, 'hopkins_streets_poly.pkl'), 'wb'))

if __name__ == '__main__':
    main()
