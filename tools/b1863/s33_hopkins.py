"""Stage 33: the Gettysburg borough in 1858 from the Hopkins county map inset (primary map, Library of Congress item 2004629149, scan la000697.jp2).

Two products, both with positions carried to UTM by the affine of docs/basemap1863/maps/transforms/hopkins-1858-gettysburg-inset.json (fit RMSE 1.9 m, leave-one-out 2.85 m, max 4.2 m on 8 control points):
 1. building symbols: solid black rectangles on the inset (text and thin lines removed by morphological opening). Footprints are the symbol extents (the engraver drew buildings schematically: size is nominal, position is the information).
    Hatched public buildings are not extracted here (the courthouse, depot and churches are in the structures catalogue).
 2. street plan: each modern street centre line of the borough (OSM highway ways) is tested against the inset: the street is present in 1858 when the inset has ink (block outline or building) on both sides of the line, at the half-width of a street right of way, along at least HOP_FRAC of the line.
Outputs: tmp/b1863/build/hopkins_buildings.pkl, hopkins_streets.pkl, docs/basemap1863/features/borough1858/*.geojson (+ README.md written by the integrator).
"""
import sys, os, json, pickle, math, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import rasterio
from rasterio.windows import Window
from shapely.geometry import Polygon, LineString, MultiPolygon, Point, shape
from shapely.ops import unary_union
import warnings; warnings.filterwarnings('ignore')

SCAN = os.path.join(C.ROOT, 'tmp', 'b1863', 'maps', 'scans', 'la000697.jp2')
TR = json.load(open(os.path.join(C.DOCS, 'maps', 'transforms', 'hopkins-1858-gettysburg-inset.json')))
A_px2en = np.array(TR['px_to_en']['A']); t_px2en = np.array(TR['px_to_en']['t'])
A_en2px = np.array(TR['en_to_px']['A']); t_en2px = np.array(TR['en_to_px']['t'])

def px2en(p):
    p = np.asarray(p, float)
    return p @ A_px2en.T + t_px2en
def en2px(e):
    e = np.asarray(e, float)
    return e @ A_en2px.T + t_en2px

# town extent of the inset in UTM: the plan lies within about 1.0 km of the Diamond (the engravings and text blocks lie outside the street plan)
CX, CY = 309076.0, 4411370.0
HALF = 1050.0

def main():
    ds = rasterio.open(SCAN)
    c, r = en2px([CX, CY])
    S = int(2 * HALF / 0.41)
    c0 = max(int(c - S // 2), 0); r0 = max(int(r - S // 2), 0)
    a = ds.read(window=Window(c0, r0, min(S, ds.width - c0), min(S, ds.height - r0)))
    gray = a.mean(0).astype(np.uint8)
    print('window', c0, r0, S, gray.shape)
    dark = (gray < 85).astype(np.uint8)
    # opening: removes text strokes (<= 7 px) and thin lines (1-3 px) but keeps solid squares (>= 13 px)
    op = cv2.morphologyEx(dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9)))
    n, lab, stats, cent = cv2.connectedComponentsWithStats(op, connectivity=8)
    polys = []
    for i in range(1, n):
        area = stats[i, cv2.CC_STAT_AREA]
        if area < 140 or area > 60000:
            continue
        m = (lab == i).astype(np.uint8)
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in cs:
            ap = cv2.approxPolyDP(cnt, 1.6, True)[:, 0, :].astype(float)
            if len(ap) < 3:
                continue
            p = ap + np.array([c0, r0])
            en = px2en(p)
            g = Polygon(en)
            if not g.is_valid:
                g = g.buffer(0)
            if g.is_empty or g.area < 12:
                continue
            polys.append(g)
    print('building symbols', len(polys), 'area m2', sum(g.area for g in polys))
    # discard symbols far from the plan: keep those within 1050 m of the Diamond AND within 70 m of another symbol (isolated text blobs, border pieces)
    hull_pts = unary_union([g.buffer(35) for g in polys])
    keep = []
    for g in polys:
        d = np.hypot(g.centroid.x - CX, g.centroid.y - CY)
        if d > HALF:
            continue
        keep.append(g)
    print('kept', len(keep))
    pickle.dump(keep, open(os.path.join(C.BUILD, 'hopkins_buildings.pkl'), 'wb'))
    # the built-up plan: symbols within 750 m of the Diamond that have at least 3 other symbols within 60 m (drops lettering of the directory text and the title, which survive the opening)
    from shapely.strtree import STRtree
    cand = [g for g in keep if math.hypot(g.centroid.x - CX, g.centroid.y - CY) < 750]
    tr = STRtree([g.centroid for g in cand])
    core = []
    for g in cand:
        nb = len(tr.query(g.centroid.buffer(60)))
        if nb >= 4:
            core.append(g)
    print('core symbols', len(core), 'of', len(cand))
    P = unary_union([g.buffer(45) for g in core]).buffer(-10).buffer(10)
    pickle.dump(core, open(os.path.join(C.BUILD, 'hopkins_buildings.pkl'), 'wb'))
    pickle.dump(P, open(os.path.join(C.BUILD, 'hopkins_hull.pkl'), 'wb'))
    print('plan area ha', P.area / 1e4)
    # streets: test the modern centre lines
    hw = json.load(open(os.path.join(C.ROOT, 'tmp', 'b1863', 'modern', 'vec', 'osm_highways.json')))
    ways = []
    for e in hw['elements']:
        tg = e.get('tags', {})
        if e['type'] != 'way' or 'geometry' not in e:
            continue
        if tg.get('highway') not in ('residential', 'tertiary', 'secondary', 'primary', 'unclassified', 'living_street', 'trunk'):
            continue
        pts = [C.ll2utm(p['lon'], p['lat']) for p in e['geometry']]
        ls = LineString(pts)
        if ls.distance(Point(CX, CY)) > HALF:
            continue
        ways.append((e['id'], tg, ls))
    print('candidate ways', len(ways))
    ink = (gray < 150).astype(np.uint8)          # lines and symbols
    ink = cv2.dilate(ink, np.ones((7, 7), np.uint8))   # +-1.2 m tolerance on the line position
    H, W = ink.shape
    res = []
    for wid, tg, ls in ways:
        L = ls.length
        if L < 15:
            continue
        ds_ = np.array([d_ for d_ in np.arange(1.0, L, 3.0) if math.hypot(ls.interpolate(d_).x - CX, ls.interpolate(d_).y - CY) < 800])
        if len(ds_) < 6:
            continue
        best = None
        for hw_ in (6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0):
            for shift in (-3, -1.5, 0, 1.5, 3):
                both = 0; tot = 0
                for d_ in ds_:
                    p = ls.interpolate(d_); q = ls.interpolate(min(d_ + 2, L)); p0 = ls.interpolate(max(d_ - 2, 0))
                    tx, ty = q.x - p0.x, q.y - p0.y; nt = math.hypot(tx, ty)
                    if nt == 0: continue
                    nx, ny = -ty / nt, tx / nt
                    sides = []
                    for sgn in (-1, 1):
                        e = np.array([[p.x + nx * (sgn * hw_ + shift * 0 ) + tx / nt * 0 + nx * shift * 0, p.y + ny * (sgn * hw_)]])
                        e = np.array([[p.x + nx * sgn * hw_ + nx * shift, p.y + ny * sgn * hw_ + ny * shift]])
                        pp = en2px(e)[0] - np.array([c0, r0])
                        x, y = int(round(pp[0])), int(round(pp[1]))
                        sides.append(0 <= x < W and 0 <= y < H and ink[y, x] > 0)
                    tot += 1; both += all(sides)
                f = both / max(tot, 1)
                if best is None or f > best[0]:
                    best = (f, hw_, shift)
        res.append(dict(osm_id=wid, name=tg.get('name'), highway=tg.get('highway'), length_m=round(L), frac=round(best[0], 2), half_width_m=best[1], shift_m=best[2], geom=ls))
    pickle.dump(res, open(os.path.join(C.BUILD, 'hopkins_streets.pkl'), 'wb'))
    # town streets drawn: every non-service highway way, clipped to the plan (P grown by 8 m). Reviewed by eye against the inset on the overlay
    # docs/basemap1863/features/borough1858/review_street_overlay.png: every drawn line runs along a street gap of the 1858 plan; alleys (highway=service) cross the blocks of the plan and are NOT drawn.
    town = []
    for q in res:
        g = q['geom'].intersection(P.buffer(8))
        if g.is_empty or g.length < 25:
            continue
        town.append(dict(osm_id=q['osm_id'], name=q['name'], highway=q['highway'], geom=g, ink_frac=q['frac']))
    pickle.dump(town, open(os.path.join(C.BUILD, 'hopkins_town_streets.pkl'), 'wb'))
    print('town streets drawn', len(town), 'length m', sum(t['geom'].length for t in town))
    for q in sorted(res, key=lambda x: -x['length_m'])[:60]:
        print('%-28s %-12s L %5d frac %.2f hw %4.1f shift %+d' % ((q['name'] or '-')[:28], q['highway'], q['length_m'], q['frac'], q['half_width_m'], q['shift_m']))

if __name__ == '__main__':
    main()
