"""tools/cvd-sheet.py - the busiest 600 x 400 area of the Day 3 assault (S1b) as seen under three colour-vision deficiencies and in greyscale.  A SOFTWARE SIMULATION: the Machado, Oliveira and Fernandes
(2009) matrices at severity 1.0, applied to linear sRGB (an assumption their page does not settle); it is not a test with people.   python tools/cvd-sheet.py"""
import os, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(HERE, '..', 'shots')
MATS = {
    'protanopia (no red cones)': [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    'deuteranopia (no green cones)': [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    'tritanopia (no blue cones)': [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
def lin(a): a = a / 255.0; return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
def gam(a): a = np.clip(a, 0, 1); return np.where(a <= 0.0031308, 12.92 * a, 1.055 * a ** (1 / 2.4) - 0.055) * 255.0
def sim(im, kind):
    a = lin(np.asarray(im.convert('RGB'), dtype=np.float64))
    if kind == 'greyscale': y = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]; a = np.stack([y, y, y], -1)
    elif kind != 'normal vision': a = a @ np.array(MATS[kind]).T
    return Image.fromarray(gam(a).astype(np.uint8))
def font(sz):
    for f in ('C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
src = [f for f in glob.glob(os.path.join(SH, 'S1b-*-crop.png'))]
if not src: raise SystemExit('run tools/shoot.mjs first (S1b crop)')
base = Image.open(src[0]).convert('RGB'); kinds = ['normal vision'] + list(MATS) + ['greyscale']
w, h = base.size; sc = 0.75; pw, ph = int(w * sc), int(h * sc); pad = 12; head = 70; lab = 30
W = 2 * pw + 3 * pad; H = head + 3 * (ph + lab + pad) + pad
sh = Image.new('RGB', (W, H), (10, 15, 20)); d = ImageDraw.Draw(sh)
d.text((pad, 12), 'Colour-vision simulation: the Day 3 assault, normal vision, three deficiencies and greyscale', fill=(244, 246, 248), font=font(24))
d.text((pad, 42), 'Software simulation (Machado et al. 2009, severity 1.0). The side is also in the position of the cell (Union left, Confederate right), so it survives all of them.', fill=(170, 181, 193), font=font(17))
for i, k in enumerate(kinds):
    r, c = divmod(i, 2); x = pad + c * (pw + pad); y = head + r * (ph + lab + pad)
    sh.paste(sim(base, k).resize((pw, ph), Image.LANCZOS), (x, y)); d.text((x, y + ph + 5), k, fill=(242, 177, 52), font=font(18))
p = os.path.join(SH, 'cvd-simulation.png'); sh.save(p); print('wrote', p, sh.size)
