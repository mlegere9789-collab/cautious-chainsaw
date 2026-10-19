"""Record control points read from a station view.
python pick.py <gcps.json> <station.png> "<id>|<name>|<kind>|lx,ly|rx,ry|<note>" ...   (lx,ly: display px in the left (scan) panel; rx,ry: display px in the right (ground) panel)
Ground panel x is measured from the panel's own left edge (i.e. rx - (S+6) if you read from the full image)."""
import sys, json, os
from common import *
gp, st = sys.argv[1], sys.argv[2]
S = json.load(open(st + '.json'))
d = json.load(open(gp)) if os.path.exists(gp) else dict(map='', scan='', gcps=[])
for spec in sys.argv[3:]:
    pid, name, kind, l, r, note = spec.split('|')
    lx, ly = map(float, l.split(',')); rx, ry = map(float, r.split(','))
    rx -= S['S'] + 6
    px = [S['scan_x0'] + lx / S['sc'], S['scan_y0'] + ly / S['sc']]
    en = [S['e0'] + rx / S['ppm'], S['n_top'] - ry / S['ppm']]
    d['gcps'] = [g for g in d['gcps'] if g['id'] != pid]
    d['gcps'].append(dict(id=pid, name=name, kind=kind, px=[round(px[0], 1), round(px[1], 1)], en=[round(en[0], 1), round(en[1], 1)], note=note, station=os.path.basename(st)))
    print(pid, px, en)
json.dump(d, open(gp, 'w'), indent=1)
