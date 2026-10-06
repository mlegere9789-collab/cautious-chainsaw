"""test/skin-montage.py - builds the comparison pictures of the skins from the PNGs that skin-sheet.mjs and skin-shots.mjs wrote (needs Pillow and numpy).

  python docs/pitch/anim/prototype/test/skin-montage.py <shots-dir>

  variants-<family>.png   the first rows of the specimen sheets of the default, colour-blind-safe and high-contrast variants, one above the other
  cvd-<family>.png        the same crop of an in-app screenshot, default (left) against colour-blind-safe (right), as seen under normal vision, protanopia, deuteranopia, tritanopia and in greyscale
  compare-z15.png         the same crop of the reference skin and the three pitched skins
The colour-vision-deficiency simulation uses the Machado, Oliveira and Fernandes (2009) severity-1.0 matrices as the author recalls them (not re-verified against the paper): it is a visual aid, not a measurement.
"""
import sys, os
import numpy as np
from PIL import Image

D = sys.argv[1] if len(sys.argv) > 1 else '.'
FAMILIES = ['field-manual', 'war-room', 'map-1863']
MATS = {
    'protanopia': [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    'deuteranopia': [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    'tritanopia': [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}

def lin(a): a = a / 255.0; return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
def gam(a): a = np.clip(a, 0, 1); return np.where(a <= 0.0031308, 12.92 * a, 1.055 * a ** (1 / 2.4) - 0.055) * 255.0
def simulate(im, kind):
    a = lin(np.asarray(im.convert('RGB'), dtype=np.float64))
    if kind == 'greyscale': y = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]; a = np.stack([y, y, y], -1)
    elif kind != 'normal': a = a @ np.array(MATS[kind]).T
    return Image.fromarray(gam(a).astype(np.uint8))
def label(im, text):
    from PIL import ImageDraw
    d = ImageDraw.Draw(im); d.rectangle((0, 0, 7 * len(text) + 8, 15), fill=(255, 255, 255)); d.text((4, 2), text, fill=(0, 0, 0)); return im

def variants():
    for f in FAMILIES:
        names = [f'sheet-{f}-paper-dpr2.png', f'sheet-{f}_cvd-paper-dpr2.png', f'sheet-{f}_contrast-paper-dpr2.png']
        ims = [Image.open(os.path.join(D, n)).convert('RGB') for n in names if os.path.exists(os.path.join(D, n))]
        if len(ims) < 3: print('skip variants', f); continue
        crops = [im.crop((0, 0, im.width, min(im.height, 1000))) for im in ims]
        out = Image.new('RGB', (crops[0].width, sum(c.height for c in crops)), (255, 255, 255)); y = 0
        for c in crops: out.paste(c, (0, y)); y += c.height
        out.save(os.path.join(D, f'variants-{f}.png')); print('wrote', f'variants-{f}.png', out.size)

def cvd():
    box = (470, 200, 970, 440)
    for f in FAMILIES:
        a = os.path.join(D, f'app-{f}-fresh2-z15-paper.png'); b = os.path.join(D, f'app-{f}_cvd-fresh2-z15-paper.png')
        if not (os.path.exists(a) and os.path.exists(b)): print('skip cvd', f); continue
        A = Image.open(a).convert('RGB').crop(box); B = Image.open(b).convert('RGB').crop(box); kinds = ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'greyscale']
        w, h = A.size; out = Image.new('RGB', (2 * w + 6, len(kinds) * (h + 4)), (255, 255, 255))
        for i, k in enumerate(kinds):
            out.paste(label(simulate(A, k), f'default / {k}'), (0, i * (h + 4))); out.paste(label(simulate(B, k), f'colour-blind safe / {k}'), (w + 6, i * (h + 4)))
        out.save(os.path.join(D, f'cvd-{f}.png')); print('wrote', f'cvd-{f}.png', out.size)

def compare():
    box = (470, 200, 970, 440); names = [('reference', 'reference'), ('field-manual', 'Field Manual'), ('war-room', 'War Room'), ('map-1863', '1863 Map')]; ims = []
    for n, t in names:
        p = os.path.join(D, f'app-{n}-fresh2-z15-paper.png')
        if os.path.exists(p): ims.append(label(Image.open(p).convert('RGB').crop(box), t))
    if len(ims) < 2: print('skip compare'); return
    w, h = ims[0].size; out = Image.new('RGB', (2 * w + 6, ((len(ims) + 1) // 2) * (h + 4)), (255, 255, 255))
    for i, im in enumerate(ims): out.paste(im, ((i % 2) * (w + 6), (i // 2) * (h + 4)))
    out.save(os.path.join(D, 'compare-z15.png')); print('wrote compare-z15.png', out.size)

def crisp():
    # the first two tiles (Union, Confederate) of the sheets at device-pixel ratio 1, 2 and 3, each enlarged to the same size with NEAREST so every device pixel is visible
    for f in FAMILIES:
        rows = []
        for d, z in ((1, 6), (2, 3), (3, 2)):
            p = os.path.join(D, f'sheet-{f}-paper-dpr{d}.png')
            if not os.path.exists(p): break
            im = Image.open(p).convert('RGB').crop((int(120 * d), int(42 * d), int(330 * d), int(80 * d))); im = im.resize((im.width * z, im.height * z), Image.NEAREST); rows.append(label(im, f'device pixel ratio {d}: each device pixel shown as {z}x{z}'))
        if len(rows) < 3: print('skip crisp', f); continue
        out = Image.new('RGB', (rows[0].width, sum(r.height for r in rows) + 8), (255, 255, 255)); y = 0
        for r in rows: out.paste(r, (0, y)); y += r.height + 4
        out.save(os.path.join(D, f'crisp-{f}.png')); print('wrote', f'crisp-{f}.png', out.size)

if __name__ == '__main__':
    variants(); cvd(); compare(); crisp()
