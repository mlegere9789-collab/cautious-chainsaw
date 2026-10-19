"""python run_montage.py CANDS first count out.png [--scan f.jp2] [--gcps f.json] [--half 100] [--zoom 1.5] [--cols 2] [--bbox e0,n0,e1,n1] [--mpp 1.027]"""
import sys, json, os, argparse
from common import *
import montage, georef
ap = argparse.ArgumentParser(); ap.add_argument('cands'); ap.add_argument('first', type=int); ap.add_argument('count', type=int); ap.add_argument('out')
ap.add_argument('--scan', default='cw0353500.jp2'); ap.add_argument('--gcps'); ap.add_argument('--half', type=int, default=100); ap.add_argument('--zoom', type=float, default=1.5); ap.add_argument('--cols', type=int, default=2)
ap.add_argument('--bbox'); ap.add_argument('--mpp', type=float, default=1.027); ap.add_argument('--model', default=''); ap.add_argument('--tif', default='naip_1m.tif')
a = ap.parse_args()
cands = json.load(open(a.cands if os.path.exists(a.cands) else os.path.join(TMP, 'ref', a.cands)))
if a.bbox:
    e0, n0, e1, n1 = map(float, a.bbox.split(',')); cands = [c for c in cands if e0 < c['e'] < e1 and n0 < c['n'] < n1]
for c in cands: c['mpp'] = a.mpp
s = 1.027
en2px = lambda e, n: (4727 + (e - 308266) / s, 8691 - (n - 4406431) / s)
if a.gcps:
    d, px, en, g = georef.load_gcps(a.gcps); kind = a.model or ('tps' if len(px) > 14 else 'affine')
    m = georef.Model(kind, 0.3 if kind == 'tps' else 0).fit(en, px); en2px = lambda e, n: tuple(m([[e, n]])[0])
print(len(cands), montage.make(os.path.join(TMP, 'scans', a.scan), en2px, cands[a.first:a.first + a.count], a.out, half=a.half, cols=a.cols, zoom=a.zoom, tif=a.tif))
