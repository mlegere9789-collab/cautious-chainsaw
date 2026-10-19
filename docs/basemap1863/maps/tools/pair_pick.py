"""python pair_pick.py <map.json> <view.png> "<id>|<name>|<kind>|lx,ly|rx,ry|note" ...  (display px in the full view image).
Stores gcp as scan px (map) <-> Warren px; the ground coordinate is derived later through the Warren transform."""
import sys, json, os, numpy as np
mj, img = sys.argv[1:3]; V = json.load(open(img + '.json')); d = json.load(open(mj)); C = np.vstack([np.array(d['coarse'], float).reshape(2, 3), [0, 0, 1.0]]); Ci = np.linalg.inv(C)
d.setdefault('pairs', [])
for spec in sys.argv[3:]:
    pid, name, kind, l, r, note = spec.split('|'); lx, ly = map(float, l.split(',')); rx, ry = map(float, r.split(','))
    rx -= V['S'] + 6
    wl = np.array([V['cx'] - V['half'] + lx / V['zoom'], V['cy'] - V['half'] + ly / V['zoom'], 1.0]); sp = (Ci @ wl)[:2]
    wr = [V['cx'] - V['half'] + rx / V['zoom'], V['cy'] - V['half'] + ry / V['zoom']]
    d['pairs'] = [p for p in d['pairs'] if p['id'] != pid]
    d['pairs'].append(dict(id=pid, name=name, kind=kind, scan_px=[round(float(sp[0]), 1), round(float(sp[1]), 1)], warren_px=[round(wr[0], 1), round(wr[1], 1)], note=note))
    print(pid, 'scan', sp.round(1), 'warren', np.round(wr, 1))
json.dump(d, open(mj, 'w'), indent=1)
