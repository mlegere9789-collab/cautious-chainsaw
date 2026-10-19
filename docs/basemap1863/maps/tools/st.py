"""python st.py E N half ppm out [scan] [gcps.json]  -> side-by-side station view"""
import sys, os, json
from common import *
from viewtools import *
import georef
ec, nc, half, ppm = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
out = sys.argv[5]; scan = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != '-' else 'cw0353500.jp2'
s = 1.027
en2px = lambda e, n: (4727 + (e - 308266) / s, 8691 - (n - 4406431) / s)
mpp = s
if len(sys.argv) > 7:
    d, px, en, g = georef.load_gcps(sys.argv[7]); kind = 'tps' if len(px) > 14 else ('poly2' if len(px) > 9 else 'affine')
    m = georef.Model(kind, 0.3 if kind == 'tps' else 0).fit(en, px); en2px = lambda e, n: tuple(m([[e, n]])[0])
station(os.path.join(TMP, 'scans', scan), en2px, ec, nc, half, out, ppm=ppm, mpp=mpp, gridm=50 if half <= 450 else 100, tif=os.environ.get('TIF','naip_1m.tif'), roads=os.environ.get('ROADS','1')=='1')
