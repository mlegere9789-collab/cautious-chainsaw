"""Zoom tiles (scan | ground) for a list of ground points, for precise reading of control points.
python zoomgrid.py out.png gcps.json "E,N[,label]" ... [--half 80 --ppm 2.5 --cols 2 --scan f.jp2 --tif naip_1m.tif --mpp 1.027 --nodes N0012,N0013]
Writes out.png and out.png.json (tile geometry).  Read points with pick_z.py using full-image display coordinates."""
import sys, os, json, argparse
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS = None
from common import *
from viewtools import _font, _grid
import georef, rasterio
from rasterio.windows import Window
ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('gcps'); ap.add_argument('pts', nargs='*')
ap.add_argument('--half', type=float, default=80); ap.add_argument('--ppm', type=float, default=2.5); ap.add_argument('--cols', type=int, default=2)
ap.add_argument('--scan', default='cw0353500.jp2'); ap.add_argument('--tif', default='naip_1m.tif'); ap.add_argument('--model', default=''); ap.add_argument('--nodes', default='')
ap.add_argument('--grid', type=float, default=20)
a = ap.parse_args()
d, px, en, g = georef.load_gcps(a.gcps)
kind = a.model or ('tps' if len(px) > 30 else ('poly2' if len(px) > 20 else 'affine'))
m = georef.Model(kind, 0.3 if kind == 'tps' else 0).fit(en, px)
en2px = lambda e, n: tuple(m([[e, n]])[0])
pts = []
mfwd = georef.Model('tps' if len(px) > 30 else ('poly2' if len(px) > 20 else 'affine'), 0.3 if len(px) > 30 else 0).fit(px, en)
for s in a.pts:
    if s.startswith('px:'):
        p = s[3:].split(','); e_, n_ = mfwd([[float(p[0]), float(p[1])]])[0]; pts.append((float(e_), float(n_), p[2] if len(p) > 2 else '')); continue
    p = s.split(','); pts.append((float(p[0]), float(p[1]), p[2] if len(p) > 2 else ''))
if a.nodes:
    nd = {x['id']: x for x in json.load(open(os.path.join(TMP, 'ref', 'road_nodes.json'))) + json.load(open(os.path.join(TMP, 'ref', 'water_nodes.json')))}
    for k in a.nodes.split(','): pts.append((nd[k]['e'], nd[k]['n'], k + ' ' + str(nd[k]['a']) + ' x ' + str(nd[k]['b'])))
scan = Image.open(os.path.join(TMP, 'scans', a.scan)); ds = rasterio.open(os.path.join(TMP, 'ref', a.tif)); T = ds.transform
mpp = 1.027
# metres per scan px from the model: local scale
S = int(2 * a.half * a.ppm); f = _font(12); tiles = []; meta = []
for k, (e, n, lab) in enumerate(pts):
    x, y = en2px(e, n)
    # local scan px per metre from the model
    x2, y2 = en2px(e + 100, n); x3, y3 = en2px(e, n + 100)
    ppm_scan = ((x2 - x) ** 2 + (y2 - y) ** 2) ** 0.5 / 100.0
    hs = a.half * ppm_scan
    sp = scan.crop((int(round(x - hs)), int(round(y - hs)), int(round(x + hs)), int(round(y + hs)))).convert('RGB').resize((S, S), Image.LANCZOS)
    x0 = int(round(x - hs)); y0 = int(round(y - hs)); sc = S / (2 * hs) if False else S / (int(round(x + hs)) - x0)
    arr = ds.read(window=Window(int(e - a.half - T.c), int(T.f - n - a.half), int(2 * a.half), int(2 * a.half)), boundless=True, fill_value=0)
    gp = Image.fromarray(arr.transpose(1, 2, 0)[:, :, :3]).resize((S, S), Image.LANCZOS)
    t = Image.new('RGB', (2 * S + 6, S + 16), (255, 255, 255)); t.paste(sp, (0, 16)); t.paste(gp, (S + 6, 16))
    dr = ImageDraw.Draw(t)
    # grid: scan every 20 m-equivalent is unknown; use fixed display grid every 'grid' metres on both panels (scan grid derived from local scale)
    step = a.grid * a.ppm
    for ox in (0, S + 6):
        gx = step
        while gx < S: dr.line([(ox + gx, 16), (ox + gx, 16 + S)], fill=(255, 0, 0) if gx != S / 2 else (255, 255, 0), width=1); gx += step
        gy = step
        while gy < S: dr.line([(ox, 16 + gy), (ox + S, 16 + gy)], fill=(0, 160, 255) if gy != S / 2 else (255, 255, 0), width=1); gy += step
    dr.text((2, 1), f"[{k}] {lab}  E{e:.0f} N{n:.0f}  (grid {a.grid:g} m)", fill=(0, 0, 0), font=f)
    tiles.append(t)
    meta.append(dict(k=k, e=e, n=n, label=lab, scan_x0=x0, scan_y0=y0, sc=sc, S=S, ppm=a.ppm, half=a.half, col=k % a.cols, row=k // a.cols))
rows = (len(tiles) + a.cols - 1) // a.cols; W, H = tiles[0].size
M = Image.new('RGB', (a.cols * W + (a.cols - 1) * 8, rows * H + (rows - 1) * 8), (255, 255, 255))
for k, t in enumerate(tiles):
    ox = (k % a.cols) * (W + 8); oy = (k // a.cols) * (H + 8); M.paste(t, (ox, oy)); meta[k]['ox'] = ox; meta[k]['oy'] = oy + 16
M.save(a.out); json.dump(dict(tiles=meta, W=W, H=H), open(a.out + '.json', 'w'))
print(M.size)
