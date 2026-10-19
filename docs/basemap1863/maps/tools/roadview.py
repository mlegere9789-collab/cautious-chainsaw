"""python roadview.py E N half ppm out gcps.json [degree]  -- scan with predicted modern road centrelines (coloured by name) | NAIP.
Pick points ON the scan road centrelines with pick_line.py."""
import sys, os, json
from PIL import Image, ImageDraw
from common import *
from viewtools import *
from viewtools import _font
import roadfit
ec, nc, half, ppm = map(float, sys.argv[1:5]); out = sys.argv[5]; gp = sys.argv[6]; deg = int(sys.argv[7]) if len(sys.argv) > 7 else 1
rf = roadfit.RoadFit(gp, degree=deg).solve()
# model EN->px: fit inverse by lsq on dense grid of the forward model
import numpy as np
from georef import Model
g = np.mgrid[0:9000:300, 0:10000:300].reshape(2, -1).T.astype(float); en = rf.f(g)
inv = Model('poly2' if deg > 1 else 'affine').fit(en, g)
en2px = lambda e, n: tuple(inv([[e, n]])[0])
os.environ['LEFTROADS'] = '0'
station(os.path.join(TMP, 'scans', 'cw0353500.jp2'), en2px, ec, nc, half, out, ppm=ppm, mpp=1.027, gridm=100, roads=False)
J = json.load(open(out + '.json')); S = J['S']; im = Image.open(out); dr = ImageDraw.Draw(im); f = _font(12)
cols = [(255, 0, 255), (255, 140, 0), (0, 200, 0), (0, 120, 255), (255, 0, 0), (160, 0, 200), (0, 170, 170), (200, 150, 0)]
names = ['Baltimore Pike', 'Taneytown Rd', 'Emmitsburg Rd', 'Fairfield Rd', 'Chambersburg Pike', 'Carlisle Rd', 'York Pike', 'Harrisburg Rd', 'Hanover Rd', 'Mummasburg Rd', 'Millerstown Rd', 'Table Rock Rd', 'Hunterstown Rd', 'Black Horse Tavern Rd', 'Knoxlyn Rd', 'Wheatfield Rd', 'Sachs Rd', 'Biglerville Rd']
for k, nm in enumerate(names):
    col = cols[k % len(cols)]
    for ln in roadfit.lines_for(nm):
        pts = []
        dens = [ln.interpolate(t) for t in np.arange(0, ln.length, 8.0)]
        dens_c = [(p.x, p.y) for p in dens]
        for (e, n) in dens_c:
            if abs(e - ec) < half * 1.3 and abs(n - nc) < half * 1.3:
                x, y = en2px(e, n); pts.append(((x - J['scan_x0']) * J['sc'], (y - J['scan_y0']) * J['sc']))
        if len(pts) > 1:
            dr.line(pts, fill=col, width=1); dr.text(pts[len(pts) // 2], nm, fill=col, font=f)
        pr = [(S + 6 + (e - J['e0']) * ppm, (J['n_top'] - n) * ppm) for (e, n) in dens_c if abs(e - ec) < half * 1.3 and abs(n - nc) < half * 1.3]
        if len(pr) > 1: dr.line(pr, fill=col, width=1)
im.save(out)
