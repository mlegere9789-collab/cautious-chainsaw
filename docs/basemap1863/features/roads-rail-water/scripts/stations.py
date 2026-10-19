"""Station panels: rotated crops with the road vertical and a perpendicular ruler, for manual perpendicular-offset measurement."""
import sys, os, json, math
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from icp import *
def station_panel(s, af, E, N, tx, ty, half=int(os.environ.get("SHALF",70)), sc=float(os.environ.get("SSC",3)), label=""):
    img = cv2.imread(os.path.join(MAPS, f'bach1879_{s}.50.jpg'))
    if hasattr(af, 'en2px'): p = np.array(af.en2px(E, N)); tp = af.jac_tangent(E, N, tx, ty)
    else: M = af.M; p = M @ np.array([E, N, 1.0]); tp = M[:, :2] @ np.array([tx, ty]); tp /= np.linalg.norm(tp)
    nrm = np.array([-tp[1], tp[0]])  # +s direction
    # panel axes: panel x (right) = nrm, panel y (down) = -tp   (road runs upward)
    size = int(2 * half * sc)
    # affine from panel coords (u,v in px of panel) to image: img = p + ((u/sc)-half)*nrm + ((v/sc)-half)*(-tp)
    A = np.array([[nrm[0] / sc, -tp[0] / sc], [nrm[1] / sc, -tp[1] / sc]])
    off = p - half * nrm + half * tp
    Mw = np.hstack([A, off[:, None]])
    out = cv2.warpAffine(img, Mw, (size, size), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_CUBIC, borderValue=(255, 255, 255))
    im = Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB)); dr = ImageDraw.Draw(im)
    c = size // 2; f = ImageFont.truetype('arial.ttf', 12)
    dr.line([(c, 0), (c, size)], fill=(0, 90, 255), width=1)
    for k in range(-half, half + 1, 5):
        x = c + k * sc; L = 14 if k % 10 == 0 else 7
        dr.line([(x, size - L), (x, size)], fill=(255, 0, 0)); dr.line([(x, 0), (x, L)], fill=(255, 0, 0))
        if k % 10 == 0 and k: dr.text((x - 8, size - 28), str(k), fill=(200, 0, 0), font=f)
    dr.text((3, 14), label, fill=(0, 0, 0), font=f)
    return im, nrm
def snap_station(gj, name, lng, lat):
    px, py = ll2m(lng, lat); best = None
    for f in gj['features']:
        if (f['properties']['name'] or '') != name: continue
        xy = [ll2m(*q[:2]) for q in f['geometry']['coordinates']]
        for i in range(len(xy) - 1):
            a, b = xy[i], xy[i + 1]; dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy
            if L2 == 0: continue
            t = max(0, min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L2)); qx, qy = a[0] + dx * t, a[1] + dy * t
            d = math.hypot(px - qx, py - qy)
            if best is None or d < best[0]: best = (d, qx, qy, dx / math.sqrt(L2), dy / math.sqrt(L2))
    return best[1:]
def road_station(gj, name, frac):
    segs = [f for f in gj['features'] if (f['properties']['name'] or '') == name]
    pts = []
    for f in segs:
        xy = [ll2m(*q[:2]) for q in f['geometry']['coordinates']]
        for i in range(len(xy) - 1): pts.append((xy[i], xy[i + 1]))
    tot = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in pts); target = frac * tot; acc = 0
    for a, b in pts:
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if acc + L >= target:
            t = (target - acc) / L; return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / L, (b[1] - a[1]) / L)
        acc += L
if __name__ == '__main__':
    s = sys.argv[1]; out = sys.argv[2]; src = sys.argv[3]
    specs = [a.split('@') for a in sys.argv[4:]]
    af = Affine(json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', src)))['M'])
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    panels = []; meta = []
    def arc_station(gj, name, d, rev):
        fs = [f for f in gj['features'] if (f['properties']['name'] or '') == name]
        f = max(fs, key=lambda f: line_len(f['geometry']['coordinates']))
        xy = [ll2m(*q[:2]) for q in f['geometry']['coordinates']]
        if rev: xy = xy[::-1]
        acc = 0
        for i in range(len(xy) - 1):
            a, b = xy[i], xy[i + 1]; L = math.hypot(b[0] - a[0], b[1] - a[1])
            if acc + L >= d:
                tt = (d - acc) / L; return a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt, (b[0] - a[0]) / L, (b[1] - a[1]) / L
            acc += L
    for nm, fr in specs:
        if ',' in fr: 
            lng, lat = map(float, fr.split(',')); E, N, tx, ty = snap_station(t, nm, lng, lat)
        else:
            rev = fr.startswith('r'); d = float(fr.lstrip('r')); E, N, tx, ty = arc_station(t, nm, d, rev); lng, lat = m2ll(E, N)
        im, nrm = station_panel(s, af, E, N, tx, ty, label=f'{nm}@{fr}')
        panels.append(im); meta.append(dict(name=nm, lng=lng, lat=lat, E=E, N=N, tx=tx, ty=ty))
    W = panels[0].width; cols = 3; rows = (len(panels) + cols - 1) // cols
    sh = Image.new('RGB', (W * cols, W * rows), (255, 255, 255))
    for i, p in enumerate(panels): sh.paste(p, ((i % cols) * W, (i // cols) * W))
    sh.save(out); json.dump(meta, open(out + '.json', 'w'))
