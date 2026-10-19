import sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from stations import *
def build(af, gj_n, names, spacing=1100.0):
    out = []
    for nm in names:
        fs = [f for f in gj_n['features'] if f['properties'].get('gnis_name') == nm and f['properties'].get('fcode') == 46006 and f['geometry']['type'] == 'LineString']
        pts = []   # all vertices with tangent
        for f in fs:
            xy = [ll2m(*q[:2]) for q in f['geometry']['coordinates']]
            for i in range(len(xy) - 1):
                (a, b) = xy[i], xy[i + 1]; L = math.hypot(b[0] - a[0], b[1] - a[1])
                if L > 0: pts.append((a[0], a[1], (b[0] - a[0]) / L, (b[1] - a[1]) / L, L))
        # greedy spacing: pick vertices at least `spacing` apart (euclid) that fall inside the sheet
        picked = []
        for p in pts:
            px, py = af.en2px(p[0], p[1])
            if not (150 < px < 4000 and 1050 < py < 5000): continue
            if all(math.hypot(p[0] - q[0], p[1] - q[1]) > spacing for q in picked): picked.append(p)
        for p in picked: out.append((nm, p))
    return out
if __name__ == '__main__':
    s = sys.argv[1]; src = sys.argv[2]; outpref = sys.argv[3]
    import regtf
    af = regtf.FieldTF()
    n = json.load(open(os.path.join(CACHE, 'nhd_6.geojson')))
    st = build(af, n, ['Rock Creek', 'Willoughby Run', 'Marsh Creek', 'Plum Run', 'White Run', 'Stevens Run', 'Littles Run'])
    print(len(st))
    meta = []
    panels = []
    for i, (nm, p) in enumerate(st):
        im, nrm = station_panel(s, af, p[0], p[1], p[2], p[3], label=f'#{i} {nm}')
        panels.append(im); meta.append(dict(id=i, name=nm, E=p[0], N=p[1], tx=p[2], ty=p[3]))
    json.dump(meta, open(outpref + '_meta.json', 'w'))
    W = panels[0].width; per = 6; cols = 3
    for k in range(0, len(panels), per):
        chunk = panels[k:k + per]; rows = (len(chunk) + cols - 1) // cols
        sh = Image.new('RGB', (W * cols, W * rows), (255, 255, 255))
        for j, p in enumerate(chunk): sh.paste(p, ((j % cols) * W, (j // cols) * W))
        sh.save(f'{outpref}_{k // per}.png')
