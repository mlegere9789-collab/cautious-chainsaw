"""python pick_line.py gcps.json station.png "<RoadName>|x,y|note" ...   x,y = display px in the LEFT (scan) panel, on the road centreline (middle of the paired edge lines)."""
import sys, json, os
gp, st = sys.argv[1:3]; S = json.load(open(st + '.json')); d = json.load(open(gp)); d.setdefault('lines', [])
for spec in sys.argv[3:]:
    road, xy, note = spec.split('|'); x, y = map(float, xy.split(','))
    n = len(d['lines']) + 1
    d['lines'].append(dict(id='L%03d' % n, road=road, px=[round(S['scan_x0'] + x / S['sc'], 1), round(S['scan_y0'] + y / S['sc'], 1)], note=note, station=os.path.basename(st)))
    print('L%03d' % n, road, d['lines'][-1]['px'])
json.dump(d, open(gp, 'w'), indent=1)
