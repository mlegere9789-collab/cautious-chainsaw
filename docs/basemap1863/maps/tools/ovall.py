import sys, os, json
from common import *
import viewtools as v
from viewtools import *
import georef
gp = sys.argv[1]; out = sys.argv[2]; kind = sys.argv[3] if len(sys.argv) > 3 else None
d, px, en, g = georef.load_gcps(gp)
kind = kind or ('tps' if len(px) > 14 else ('poly2' if len(px) > 9 else 'affine'))
m = georef.Model(kind, 0.3 if kind == 'tps' else 0).fit(en, px)
en2px = lambda e, n: tuple(m([[e, n]])[0])
v.vec('tiger_local'); v._VEC['tiger_local'] = [] if os.environ.get('NOLOCAL', '1') == '1' else v._VEC['tiger_local']
x0, y0, x1, y1 = [int(t) for t in (sys.argv[4].split(',') if len(sys.argv) > 4 else (0, 500, 8878, 9700))]
overlay_roads(os.path.join(TMP, 'scans', 'cw0353500.jp2'), x0, y0, x1, y1, en2px, out, scale=float(os.environ.get('SC', '0.17')), step=1000, water=os.environ.get('WATER', '0') == '1')
print(kind, len(px))
