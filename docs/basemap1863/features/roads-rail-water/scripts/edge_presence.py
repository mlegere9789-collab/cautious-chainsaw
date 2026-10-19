"""Pass 4b: for every TIGER edge in the box that lies on Bachelder sheet 'a', test whether a drawn road (double line) runs along it.
Same detector as map_check.py (pair of parallel lines 4-12 px apart, each present along 70 percent of 18 px of tangent, searched within +-16 px), samples every 40 m;
control = same samples displaced 110-140 px sideways. An edge is 'drawn' when detection >= 0.55 and control <= 0.20 and at least 4 samples."""
import sys, os, json, math, collections
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import map_check as mc
from common import *
import regtf
from shapely.geometry import shape
def main():
    mc.INK = mc.ink(); af = regtf.FieldTF()
    rows = json.load(open(os.path.join(OUT, 'modern-roads-remove.json')))
    tig = {f['properties']['linearid']: f for f in json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))['features']}
    out = {}
    for r in rows:
        f = tig.get(r['tiger_linearid']);
        if not f: continue
        ln = shape(f['geometry']); xy = [ll2m(*c[:2]) for c in ln.coords]
        n = 0; det = 0; ctl = 0.0; acc = 0; nxt = 0; offs = []
        for i in range(len(xy) - 1):
            (x1, y1), (x2, y2) = xy[i], xy[i + 1]; L = math.hypot(x2 - x1, y2 - y1)
            if L < 1e-6: continue
            tx, ty = (x2 - x1) / L, (y2 - y1) / L
            while nxt <= acc + L:
                t = (nxt - acc) / L; E = x1 + (x2 - x1) * t; N = y1 + (y2 - y1) * t; nxt += 40.0
                px, py = af.en2px(E, N)
                if not (80 < px < 4060 and 450 < py < 5300): continue
                lng, lat = m2ll(E, N)
                if not in_xbox(lng, lat): continue
                n += 1
                ok, o = mc.detect(af, E, N, tx, ty)
                if ok: det += 1; offs.append(o)
                ctl += sum(mc.detect(af, E, N, tx, ty, shift=s)[0] for s in (-140, -110, 110, 140)) / 4.0
            acc += L
        if n == 0: out[r['tiger_linearid']] = dict(on_sheet=False); continue
        dr = det / n; cr = ctl / n
        out[r['tiger_linearid']] = dict(on_sheet=True, samples=n, detection=round(dr, 2), control=round(cr, 2), drawn=bool(n >= 4 and dr >= 0.55 and cr <= 0.20), median_offset_m=(round(float(np.median(offs)) * 2.0, 1) if offs else None))
    return out
if __name__ == '__main__':
    o = main()
    json.dump(dict(method=__doc__, results=o), open(os.path.join(OUT, 'verification', 'pass4b_edge_presence.json'), 'w'), indent=1)
    rows = json.load(open(os.path.join(OUT, 'modern-roads-remove.json')))
    c = collections.Counter()
    for r in rows:
        v = o.get(r['tiger_linearid'], {})
        c[(r['cls'], 'drawn' if v.get('drawn') else ('on sheet, not drawn' if v.get('on_sheet') else 'off sheet'))] += 1
    for k, v in sorted(c.items()): print(k, v)
