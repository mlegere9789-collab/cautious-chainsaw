"""Crop helpers with labelled pixel grids, for picking control points by eye.
   scan_crop(path, x0,y0,x1,y1, out, step, scale)   -> crop of a map scan with grid labels in scan pixels
   ground_crop(e0,n0,e1,n1, out, res, step)       -> crop of the NAIP mosaic (UTM 18N) with grid labels in metres"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS = None
from common import *
def _font(sz):
    for f in ['arial.ttf', 'C:/Windows/Fonts/arial.ttf']:
        try: return ImageFont.truetype(f, sz)
        except Exception: pass
    return ImageFont.load_default()
def _grid(im, x0, y0, step, scale, lab=lambda v: str(v), flipy=None):
    d = ImageDraw.Draw(im); f = _font(13)
    W, H = im.size
    gx = (x0 // step + 1) * step
    while (gx - x0) * scale < W:
        X = (gx - x0) * scale; d.line([(X, 0), (X, H)], fill=(255, 0, 0), width=1); d.text((X + 2, 2), lab(gx), fill=(255, 0, 0), font=f); gx += step
    gy = (y0 // step + 1) * step
    while (gy - y0) * scale < H:
        Y = (gy - y0) * scale; d.line([(0, Y), (W, Y)], fill=(0, 0, 255), width=1); d.text((2, Y + 2), lab(gy), fill=(0, 0, 255), font=f); gy += step
    return im
def scan_crop(path, x0, y0, x1, y1, out, step=100, scale=1.0, gamma=None):
    im = Image.open(path).crop((x0, y0, x1, y1)).convert('RGB')
    if scale != 1.0: im = im.resize((int((x1 - x0) * scale), int((y1 - y0) * scale)), Image.LANCZOS)
    _grid(im, x0, y0, step, scale).save(out)

import json, numpy as np, rasterio
from rasterio.windows import Window
_VEC = {}
def vec(name):
    if name not in _VEC:
        p = os.path.join(TMP, 'ref', name + '.geojson')
        d = json.load(open(p)); _VEC[name] = [(f['properties'].get('NAME') or f['properties'].get('gnis_name'), f['geometry']) for f in d['features']]
    return _VEC[name]
def ground_crop(e0, n0, e1, n1, out, scale=1.0, step=100, roads=False, water=False, tif='naip_1m.tif', labels=True):
    """crop of the NAIP mosaic; scale = output px per metre."""
    with rasterio.open(os.path.join(TMP, 'ref', tif)) as ds:
        T = ds.transform; col0 = int(e0 - T.c); row0 = int(T.f - n1)
        w = int(e1 - e0); h = int(n1 - n0)
        a = ds.read(window=Window(col0, row0, w, h), boundless=True, fill_value=0)
    im = Image.fromarray(a.transpose(1, 2, 0)[:, :, :3])
    if scale != 1.0: im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    def P(x, y): return ((x - e0) * scale, (n1 - y) * scale)
    def lines(name, col):
        for nm, g in vec(name):
            cs = g['coordinates'] if g['type'] == 'LineString' else sum(g['coordinates'], [])
            segs = [g['coordinates']] if g['type'] == 'LineString' else g['coordinates']
            for s in segs: d.line([P(*c[:2]) for c in s], fill=col, width=1)
    if roads:
        for n, c in [('tiger_local', (255, 255, 0)), ('tiger_secondary', (255, 160, 0)), ('tiger_primary', (255, 80, 0)), ('tiger_rail', (255, 0, 255))]: lines(n, c)
    if water: lines('nhd_flowline', (0, 200, 255))
    f = _font(13)
    gx = (int(e0) // step + 1) * step
    while gx < e1:
        X = (gx - e0) * scale; d.line([(X, 0), (X, im.size[1])], fill=(255, 0, 0), width=1); d.text((X + 2, 2), str(gx), fill=(255, 255, 255), font=f); gx += step
    gy = (int(n0) // step + 1) * step
    while gy < n1:
        Y = (n1 - gy) * scale; d.line([(0, Y), (im.size[0], Y)], fill=(0, 160, 255), width=1); d.text((2, Y + 2), str(gy), fill=(255, 255, 255), font=f); gy += step
    im.save(out)

def overlay_roads(scan, x0, y0, x1, y1, en2px, out, scale=1.0, step=100, water=True, nodes=None):
    """scan crop with modern TIGER roads (and NHD streams) drawn through en2px(E,N)->(x,y) scan px."""
    im = Image.open(scan).crop((x0, y0, x1, y1)).convert('RGB')
    if scale != 1.0: im = im.resize((int((x1 - x0) * scale), int((y1 - y0) * scale)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    def P(e, n):
        x, y = en2px(e, n); return ((x - x0) * scale, (y - y0) * scale)
    for name, col in [('tiger_local', (255, 0, 255)), ('tiger_secondary', (255, 120, 0)), ('tiger_primary', (255, 0, 0)), ('tiger_rail', (0, 160, 0))] + ([('nhd_flowline', (0, 140, 255))] if water else []):
        for nm, g in vec(name):
            segs = [g['coordinates']] if g['type'] == 'LineString' else g['coordinates']
            for s in segs:
                pts = [P(*c[:2]) for c in s]
                if any(-50 < p[0] < im.size[0] + 50 and -50 < p[1] < im.size[1] + 50 for p in pts): d.line(pts, fill=col, width=1)
    _grid(im, x0, y0, step, scale)
    im.save(out)

def station(scan, en2px, ec, nc, half, out, ppm=0.5, mpp=1.027, roads=True, gridm=100, tif='naip_1m.tif'):
    """side-by-side: [scan crop | NAIP crop(+TIGER)] centred on ground point (ec,nc), +-half metres. Left grid labelled in scan px, right in metres."""
    x, y = en2px(ec, nc); hs = half / mpp
    x0, y0, x1, y1 = int(x - hs), int(y - hs), int(x + hs), int(y + hs)
    S = int(2 * half * ppm)
    im = Image.open(scan).crop((x0, y0, x1, y1)).convert('RGB').resize((S, S), Image.LANCZOS)
    sc = S / (x1 - x0)
    # grid on the scan: every 100 scan px
    _grid(im, x0, y0, 100, sc)
    if roads and os.environ.get('LEFTROADS', '1') == '1':
        d = ImageDraw.Draw(im)
        for name, col in [('tiger_local', (255, 0, 255)), ('tiger_secondary', (255, 120, 0)), ('tiger_primary', (255, 0, 0)), ('tiger_rail', (0, 150, 0))]:
            for nm, gg in vec(name):
                segs = [gg['coordinates']] if gg['type'] == 'LineString' else gg['coordinates']
                for sg in segs:
                    if not any(abs(c[0] - ec) < half * 1.2 and abs(c[1] - nc) < half * 1.2 for c in sg): continue
                    pts = []
                    for c in sg:
                        px_, py_ = en2px(c[0], c[1]); pts.append(((px_ - x0) * sc, (py_ - y0) * sc))
                    d.line(pts, fill=col, width=1)
    ground_crop(ec - half, nc - half, ec + half, nc + half, out + '.g.png', scale=ppm, step=gridm, roads=roads, tif=tif)
    g = Image.open(out + '.g.png'); g.load()
    json.dump(dict(scan_x0=x0, scan_y0=y0, sc=sc, e0=ec - half, n_top=nc + half, ppm=ppm, S=S), open(out + '.json', 'w'))
    M = Image.new('RGB', (2 * S + 6, S), (255, 255, 255)); M.paste(im, (0, 0)); M.paste(g, (S + 6, 0)); M.save(out); g.close()
    try: os.remove(out + '.g.png')
    except Exception: pass
