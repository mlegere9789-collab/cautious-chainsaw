"""Draw gazetteer road lines (and optional extra polylines) over a crop of the Warren scan. usage: overlay.py x0 y0 w h scale out [names...]"""
import os, sys, json
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS'] = str(2**40)
sys.path.insert(0, os.path.dirname(__file__))
import rc, cv2, numpy as np
x0, y0, w, h, sc, out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
only = set(sys.argv[7:])
W = rc.WARREN(); im = cv2.imread(os.path.join(rc.SCANS, 'cw0353500.jp2'), cv2.IMREAD_COLOR)
c = im[y0:y0 + h, x0:x0 + w].copy(); c = cv2.resize(c, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
G = json.load(open(os.path.join(rc.ROOT, 'docs', 'battle-theatre', 'app', 'data', 'gazetteer.json'), encoding='utf-8'))
extra = []
ef = os.path.join(rc.ROOT, 'docs', 'battle-theatre', 'app', 'data', 'road-concordance.json')
cols = [(0,0,255),(255,0,0),(0,160,0),(200,0,200),(0,140,255),(160,160,0),(0,0,0)]
k = 0
for p in G['places']:
    if p['kind'] != 'line' or not p.get('line'): continue
    if only and p['name'] not in only: continue
    col = cols[k % len(cols)]; k += 1
    pts = [W.ll2px(q['lng'], q['lat']) for q in p['line']]
    pts = [((x - x0) * sc, (y - y0) * sc) for x, y in pts]
    for a, b in zip(pts, pts[1:]):
        cv2.line(c, (int(a[0]), int(a[1])), (int(b[0]), int(b[1])), col, 2)
    # label at the first in-view vertex
    for (x, y) in pts:
        if 0 < x < c.shape[1] - 80 and 0 < y < c.shape[0] - 10:
            cv2.putText(c, p['name'], (int(x) + 4, int(y) + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.5, col, 2); break
# box edge
bx = [(-77.272, 39.838), (-77.2, 39.838), (-77.2, 39.783), (-77.272, 39.783)]
pp = [W.ll2px(*q) for q in bx]; pp = [((x - x0) * sc, (y - y0) * sc) for x, y in pp]
for a, b in zip(pp, pp[1:] + pp[:1]): cv2.line(c, (int(a[0]), int(a[1])), (int(b[0]), int(b[1])), (255, 0, 255), 1)
cv2.imwrite(out, c); print(c.shape)
