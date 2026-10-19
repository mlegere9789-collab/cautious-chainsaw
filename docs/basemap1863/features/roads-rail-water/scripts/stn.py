"""stn.py OUT TF Road@dist[,rev] ... : station panels (road vertical, ruler +-70 px, ticks 5 px, labels 10) for hand-reading the lateral offset of the drawn road."""
import sys, os, json, math
os.environ.setdefault('SHALF', '70'); os.environ.setdefault('SSC', '3')
sys.path.insert(0, os.path.dirname(__file__))
from stations import *
if __name__ == '__main__':
    out, tf = sys.argv[1], sys.argv[2]
    af = Affine(json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', tf)))['M'])
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    def arc_station(gj, name, d, rev):
        fs = [f for f in gj['features'] if (f['properties']['name'] or '') == name]
        # chain all edges of this name in file order is not reliable: use longest edge only
        f = max(fs, key=lambda f: line_len(f['geometry']['coordinates']))
        xy = [ll2m(*q[:2]) for q in f['geometry']['coordinates']]
        if rev: xy = xy[::-1]
        acc = 0
        for i in range(len(xy) - 1):
            a, b = xy[i], xy[i + 1]; L = math.hypot(b[0] - a[0], b[1] - a[1])
            if acc + L >= d:
                tt = (d - acc) / L; return a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt, (b[0] - a[0]) / L, (b[1] - a[1]) / L
            acc += L
    panels = []; meta = []
    for spec in sys.argv[3:]:
        nm, d = spec.split('@'); rev = d.startswith('r'); dd = float(d.lstrip('r'))
        E, N, tx, ty = arc_station(t, nm, dd, rev)
        im, nrm = station_panel('a', af, E, N, tx, ty, label=f'{len(panels)}: {nm}@{d}')
        panels.append(im); meta.append(dict(i=len(panels) - 1, road=nm, d=d, E=E, N=N, tx=tx, ty=ty))
    W = panels[0].width; cols = 3; rows = (len(panels) + cols - 1) // cols
    sh = Image.new('RGB', (W * cols, W * rows), (255, 255, 255))
    for i, p in enumerate(panels): sh.paste(p, ((i % cols) * W, (i // cols) * W))
    sh.save(out); json.dump(meta, open(out + '.json', 'w'))
