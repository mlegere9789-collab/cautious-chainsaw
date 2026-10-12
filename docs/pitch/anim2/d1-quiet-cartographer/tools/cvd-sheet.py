"""cvd-sheet.py - the colour-vision sheet: one real crop (the Wheatfield, z15, 600x400 CSS px at DPR 2) as a normal viewer sees it and under simulated protanopia, deuteranopia, tritanopia and greyscale
(Machado, Oliveira and Fernandes 2009, severity 1.0, applied in linear RGB: the matrices of the symbology job's src/colour.mjs, copied here; the greyscale is the WCAG relative luminance).  Software
simulation, not people.   python tools/cvd-sheet.py [day|night] [folder]   ->  <folder>/cvd-<ground>.png (the folder holds the round's scene crops)
"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); D1 = os.path.dirname(HERE)
ground = sys.argv[1] if len(sys.argv) > 1 else 'day'
folder = sys.argv[2] if len(sys.argv) > 2 else os.path.join(D1, 'shots', 'round-1')
src = os.path.join(folder, 's2-wheatfield-rose-woods-z15-t295' + ('' if ground == 'day' else '-night') + '-crop.png')
M = {
    'protanopia': [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    'deuteranopia': [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
    'tritanopia': [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
}
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.float64) / 255.0
lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
enc = lambda l: np.clip(np.where(l <= 0.0031308, l * 12.92, 1.055 * np.power(np.maximum(l, 0), 1 / 2.4) - 0.055), 0, 1)
out = {'normal': im}
for k, m in M.items(): out[k] = Image.fromarray((enc(lin @ np.array(m).T) * 255 + 0.5).astype(np.uint8))
y = lin @ np.array([0.2126, 0.7152, 0.0722]); g = (enc(y) * 255 + 0.5).astype(np.uint8); out['greyscale'] = Image.fromarray(np.stack([g, g, g], -1))
w, h = im.size; names = ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'greyscale']; pad = 20; lab = 40
cols = 3; rows = 2; W = cols * w + (cols + 1) * pad; H = rows * (h + lab) + (rows + 1) * pad + 70
sheet = Image.new('RGB', (W, H), (11, 15, 21)); d = ImageDraw.Draw(sheet); fb = ImageFont.truetype('C:/Windows/Fonts/LiberationSans-Bold.ttf', 30); fr = ImageFont.truetype('C:/Windows/Fonts/LiberationSans-Regular.ttf', 24)
d.text((pad, 16), f'Colour vision, {ground} atlas: the Wheatfield at zoom 15 (a real 100 % crop, DPR 2)', font=fb, fill=(238, 243, 248)); d.text((pad, 52), 'Software simulation (Machado 2009, severity 1.0), not people.  Side is carried by hue, by lightness and, in greyscale, by facing (Union reads rightward, Confederate leftward) and the end of the flag (swallow-tail, point); the contested side by hatching; arm by shape.', font=fr, fill=(170, 182, 196))
for i, n in enumerate(names):
    r, c = divmod(i, cols); x = pad + c * (w + pad); yy = 70 + pad + r * (h + lab + pad)
    d.text((x, yy + 4), n, font=fb, fill=(238, 243, 248)); sheet.paste(out[n], (x, yy + lab))
p = os.path.join(folder, f'cvd-{ground}.png'); sheet.save(p, optimize=True); print('wrote', p, sheet.size)
