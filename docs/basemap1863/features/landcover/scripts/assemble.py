import json, sys, numpy as np, cv2
from shapely.geometry import Polygon, MultiPolygon, box
from shapely.ops import unary_union
from shapely import affinity, wkt
sys.path.insert(0, 'scripts')
d = json.load(open('decisions.json'))
Bc = {int(c['id'][1:]): c for c in json.load(open('auto_core.json'))}
Cc = {int(c['id'][1:]): c for c in json.load(open('auto_c2.json'))}
def poly_of(c):
    p = Polygon(c['pts'], c.get('holes', [])).buffer(0)
    return p
W = set(d['wood']); WC = set(d['woodC']); OB = set(d['orchardB']); OC = set(d['orchardC']); MB = set(d['marshB']); MC = set(d['marshC'])
# conflict resolution (checked visually in conf.png)
OC.discard(105); WC.discard(105); W.discard(51) if False else None
OB -= (W & OB) - {119}
W.discard(119)
OC -= WC & OC
woods = []; orchards = []; marsh = []
for i in W:
    if i in Bc:
        p = poly_of(Bc[i])
        if i == 51:  # BRT: fill summit holes (dense contours masked, symbols show timber)
            p = Polygon(p.exterior) if p.geom_type == 'Polygon' else unary_union([Polygon(g.exterior) for g in p.geoms])
        woods.append(('B%03d' % i, p))
for i in WC:
    if i in Cc: woods.append(('C%04d' % i, poly_of(Cc[i])))
for i in OB:
    if i in Bc: orchards.append(('B%03d' % i, poly_of(Bc[i])))
for i in OC:
    if i in Cc: orchards.append(('C%04d' % i, poly_of(Cc[i])))
for i in MB:
    if i in Bc: marsh.append(('B%03d' % i, poly_of(Bc[i])))
for i in MC:
    if i in Cc: marsh.append(('C%04d' % i, poly_of(Cc[i])))
scatter = []
scatter_res = []
for p in d['poly']:
    g = Polygon(p['pts']).buffer(0)
    if p['cls'] in ('orchard', 'scattered', 'wood'):
        gg = refine(g, T=0.02, close=31, opn=5, minarea=1500) if False else None
    rec = (p['name'], g)
    {'wood': woods, 'orchard': orchards, 'marsh': marsh, 'scattered': scatter}[p['cls']].append(rec)

# ---- residual dense-symbol components not picked in the tile review (area >= 15000 px2), reviewed visually (res_a/b/c sheets)
res = np.load('uncovered_sym.npy')
nres, labr, str_, cenr = cv2.connectedComponentsWithStats(res, connectivity=8)
for i in range(1, nres):
    ar = int(str_[i, cv2.CC_STAT_AREA])
    if ar < 15000: continue
    cx, cy = cenr[i]
    if cy < 760 or cy > 9480 or cx < 360 or cx > 8470: continue            # legend text / neatline
    if 4800 < cx < 5950 and 3300 < cy < 4450: continue                      # town: building symbols
    if 4650 < cx < 4950 and 7850 < cy < 8100: continue                      # LRT west slope / Plum Run dots: handled by manual polygons (cleared per NPS CLR)
    x, y, w, h = str_[i, 0], str_[i, 1], str_[i, 2], str_[i, 3]
    sub = (labr[y:y+h, x:x+w] == i).astype(np.uint8)
    cs, _ = cv2.findContours(sub, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in cs:
        if len(c) < 4 or cv2.contourArea(c) < 8000: continue
        g = Polygon((c[:, 0, :] + [x, y]).tolist()).buffer(0)
        (woods if ar >= 45000 else scatter).append(('R%04d' % i, g))


# ---- glyph clusters (small orchard/yard/tree-row symbols) not already covered; snapshot in glyph_clusters.json
for gc in json.load(open('glyph_clusters.json')):
    if gc['covered'] >= 0.35: continue
    g = wkt.loads(gc['geom'])
    scatter.append(('G%04d' % gc['id'], g))

# symbol-density wood areas (Culp's Hill etc.)
D = np.load('sym_dens.npy', mmap_mode='r')
for r in d.get('symroi', []):
    roi = np.array(r['roi'], np.int32)
    x0, y0 = roi.min(0); x1, y1 = roi.max(0)
    m = (np.array(D[y0:y1, x0:x1]) > r['T']).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
    mask = np.zeros_like(m); cv2.fillPoly(mask, [roi - [x0, y0]], 1); m &= mask
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for k, c in enumerate(cs):
        if cv2.contourArea(c) < 4000: continue
        pts = (c[:, 0, :] + [x0, y0]).tolist(); woods.append((f"SYM-{r['name'][:12]}-{k}", Polygon(pts).buffer(0)))

Dd = np.load('sym_dens.npy', mmap_mode='r')
def refine(g, T=0.025, close=9, opn=7, minarea=900):
    out = []
    for p in ([g] if g.geom_type == 'Polygon' else list(g.geoms)):
        x0, y0, x1, y1 = [int(v) for v in p.bounds]; x0 -= 4; y0 -= 4; x1 += 4; y1 += 4
        x0 = max(x0, 0); y0 = max(y0, 0); x1 = min(x1, Dd.shape[1]); y1 = min(y1, Dd.shape[0])
        if x1 <= x0 or y1 <= y0: continue
        pm = np.zeros((y1 - y0, x1 - x0), np.uint8)
        ext = np.array(p.exterior.coords, np.float64); cv2.fillPoly(pm, [np.round(ext - [x0, y0]).astype(np.int32)], 1)
        for h in p.interiors: cv2.fillPoly(pm, [np.round(np.array(h.coords) - [x0, y0]).astype(np.int32)], 0)
        m = (np.array(Dd[y0:y1, x0:x1]).astype(np.float32) > T).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close, close)))
        m &= pm
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (opn, opn)))
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cs:
            if cv2.contourArea(c) < minarea or len(c) < 4: continue
            out.append(Polygon((c[:, 0, :] + [x0, y0]).tolist()).buffer(0))
    return unary_union(out) if out else None
def refl(lst, **k):
    r = []
    for n, g in lst:
        if n.startswith('C') and n[1:].isdigit():
            gg = refine(g, **k)
            if gg is not None and not gg.is_empty: r.append((n, gg))
        else: r.append((n, g))
    return r
orchards = refl(orchards); marsh = refl(marsh, T=0.015, minarea=500)
woods_ref = []
for n, g in woods:
    if n.startswith('C') and n[1:].isdigit():
        gg = refine(g, T=0.04, close=15, opn=11, minarea=2000)
        if gg is not None and not gg.is_empty: woods_ref.append((n, gg))
    else: woods_ref.append((n, g))
woods = woods_ref
import re
def is_auto(n): return bool(re.match(r'^(B\d{3}|C\d{4}|SYM-|R\d{4}|G\d{4})', n))
dropped = []
def refine_hand(lst):
    r = []
    for n, g in lst:
        if is_auto(n): r.append((n, g)); continue
        gg = refine(g, T=0.055, close=41, opn=9, minarea=2500)
        if gg is None or gg.is_empty: dropped.append(n)
        else:
            gg = gg.buffer(8).intersection(g)
            r.append((n, gg))
    return r
woods = refine_hand(woods); orchards = refine_hand(orchards); scatter = refine_hand(scatter)
print('hand polygons dropped (no symbols):', dropped)
WU = unary_union([g for n, g in woods])
orchards = [(n, g.difference(WU)) for n, g in orchards]
scatter = [(n, g.difference(WU)) for n, g in scatter]
orchards = [(n, g) for n, g in orchards if not g.is_empty and g.area > 600]
json.dump({'woods': [(n, g.wkt) for n, g in woods], 'orchards': [(n, g.wkt) for n, g in orchards], 'marsh': [(n, g.wkt) for n, g in marsh], 'scatter': [(n, g.wkt) for n, g in scatter]}, open('assembled_px.json', 'w'))
print({k: len(v) for k, v in [('woods', woods), ('orchards', orchards), ('marsh', marsh), ('scatter', scatter)]})
