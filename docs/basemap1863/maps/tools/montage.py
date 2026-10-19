"""Montage of paired patches (map scan | NAIP) around candidate ground points, for reading control-point offsets by eye.
   python montage.py <scan> <transform.json|coarse> <cands.json> <first> <count> <out.png> [half=60]"""
import sys, json, os, numpy as np
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS = None
import rasterio
from rasterio.windows import Window
from common import *
from viewtools import _font

def naip_patch(ds, e, n, half, scale=1.0):
    T = ds.transform; a = ds.read(window=Window(int(e - half - T.c), int(T.f - n - half), 2 * half, 2 * half), boundless=True, fill_value=0)
    return Image.fromarray(a.transpose(1, 2, 0)[:, :, :3])

def make(scan_path, en2px, cands, out, half=60, cols=3, zoom=2.0, tif='naip_1m.tif'):
    scan = Image.open(scan_path); ds = rasterio.open(os.path.join(TMP, 'ref', tif)); f = _font(12)
    S = int(2 * half * zoom); tiles = []
    for k, c in enumerate(cands):
        x, y = en2px(c['e'], c['n'])
        # scan patch of equal ground size: scale from ground metres is handled by caller via c['mpp'] (m per scan px)
        mpp = c.get('mpp', 1.027); hs = half / mpp
        sp = scan.crop((int(x - hs), int(y - hs), int(x + hs), int(y + hs))).convert('RGB').resize((S, S), Image.LANCZOS)
        npch = naip_patch(ds, c['e'], c['n'], half).resize((S, S), Image.LANCZOS)
        t = Image.new('RGB', (2 * S + 4, S + 16), (255, 255, 255)); t.paste(sp, (0, 16)); t.paste(npch, (S + 4, 16))
        d = ImageDraw.Draw(t)
        for ox in (0, S + 4):
            d.line([(ox + S / 2 - 8, 16 + S / 2), (ox + S / 2 + 8, 16 + S / 2)], fill=(255, 0, 0)); d.line([(ox + S / 2, 16 + S / 2 - 8), (ox + S / 2, 16 + S / 2 + 8)], fill=(255, 0, 0))
            for g in range(-half, half + 1, 20):  # ticks every 20 m
                gx = ox + S / 2 + g * zoom; d.line([(gx, 16 + S - 5), (gx, 16 + S)], fill=(0, 0, 255)); d.line([(ox + (0 if ox == 0 else 0), 16 + S / 2 + g * zoom), (ox + 5, 16 + S / 2 + g * zoom)], fill=(0, 0, 255))
        d.text((2, 1), f"{c.get('id', k)}  {c.get('a','')} x {c.get('b','')}  E{int(c['e'])} N{int(c['n'])}", fill=(0, 0, 0), font=f)
        tiles.append(t)
    rows = (len(tiles) + cols - 1) // cols; W = tiles[0].size[0]; H = tiles[0].size[1]
    M = Image.new('RGB', (cols * W + (cols - 1) * 6, rows * H + (rows - 1) * 6), (255, 255, 255))
    for k, t in enumerate(tiles): M.paste(t, ((k % cols) * (W + 6), (k // cols) * (H + 6)))
    M.save(out); return M.size
