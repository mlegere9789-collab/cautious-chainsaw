"""python pick_z.py gcps.json zoom.png "<id>|<name>|<kind>|tile|lx,ly|rx,ry|note" ...   (lx,ly,rx,ry = full-image display px)"""
import sys, json, os
from common import *
gp, img = sys.argv[1:3]; Z = json.load(open(img + '.json')); d = json.load(open(gp))
for spec in sys.argv[3:]:
    pid, name, kind, tile, l, r, note = spec.split('|'); t = Z['tiles'][int(tile)]
    lx, ly = map(float, l.split(',')); rx, ry = map(float, r.split(','))
    lx -= t['ox']; ly -= t['oy']; rx -= t['ox'] + t['S'] + 6; ry -= t['oy']
    px = [t['scan_x0'] + lx / t['sc'], t['scan_y0'] + ly / t['sc']]
    en = [t['e'] - t['half'] + rx / t['ppm'], t['n'] + t['half'] - ry / t['ppm']]
    d['gcps'] = [g for g in d['gcps'] if g['id'] != pid]
    d['gcps'].append(dict(id=pid, name=name, kind=kind, px=[round(px[0], 1), round(px[1], 1)], en=[round(en[0], 1), round(en[1], 1)], note=note, station=os.path.basename(img) + '#' + tile))
    print(pid, [round(v, 1) for v in px], [round(v, 1) for v in en])
json.dump(d, open(gp, 'w'), indent=1)
