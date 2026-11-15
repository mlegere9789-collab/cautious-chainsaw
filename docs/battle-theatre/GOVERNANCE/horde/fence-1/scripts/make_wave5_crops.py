"""Cut the page-image crops of the 2026-11-15 (wave 5) pass of fence-1 from the page-image PDFs downloaded from archive.org
(public domain; the PDFs are scratch under tmp/fence-1/dl, md5 equal to the archive.org record, recorded in image_checks.json).
Writes tmp/fence-1/run5/img/*.png; make_image_checks.py copies them into horde/fence-1/images/ and records their sha256.
Run: python3 -I make_wave5_crops.py   (needs pdftoppm and Pillow; read-only on the PDFs)"""
import os, subprocess
from PIL import Image
ROOT = '/home/user/cautious-chainsaw'
DL = os.path.join(ROOT, 'tmp/fence-1/dl')
OUT = os.path.join(ROOT, 'tmp/fence-1/run5/img')
os.makedirs(OUT, exist_ok=True)

def render(pdf, page, dpi, name):
    base = os.path.join(OUT, name)
    subprocess.run(['pdftoppm', '-f', str(page), '-l', str(page), '-r', str(dpi), '-gray', '-png', pdf, base], check=True)
    cands = [f for f in os.listdir(OUT) if f.startswith(name + '-') and f.endswith('.png')]
    assert len(cands) == 1, cands
    p = os.path.join(OUT, cands[0]); q = os.path.join(OUT, name + '_full.png'); os.replace(p, q)
    return Image.open(q)

def save(im, name):
    im = im.convert('L'); p = os.path.join(OUT, name); im.save(p, optimize=True); return p

# 1. Adams Sentinel 21 Jul 1863, PDF page 2 (200 ppi CCITT scan): the middle column about the Theological Seminary
im = render(os.path.join(DL, 'adams-sentinel-1863-07-21/adams-sentinel-1863-07-21.pdf'), 2, 200, 'sentinel_p2')
box = (1900, 1690, 3050, 2480); c = im.crop(box); c = c.resize((int(c.size[0] * 1.5), int(c.size[1] * 1.5)), Image.LANCZOS)
save(c, 'adams-sentinel-1863-07-21-seminary-x1.5.png')

# 2. New York Monuments Commission volume (finalreportonba00chatgoog), PDF page 297 (= leaf index 296; 600 ppi JBIG2 scan): inscription of the 95th NY monument
im = render(os.path.join(DL, 'finalreportonba00chatgoog/finalreportonba00chatgoog.pdf'), 297, 300, 'ny2_p297')
s = im.size[0] / 3849.0          # the djvu.xml coordinates of the item are in a 3849 x 4878 px frame
box = (int(1350 * s), int(1780 * s), int(2750 * s), int(2900 * s)); c = im.crop(box); c = c.resize((int(c.size[0] * 1.4), int(c.size[1] * 1.4)), Image.LANCZOS)
save(c, 'ny-gb-1900-v2-p732-95th-inscription-x1.4.png')
def cut(x1, y1, x2, y2, k=5):
    c = im.crop((int(x1 * s), int(y1 * s), int(x2 * s), int(y2 * s))); return c.resize((c.size[0] * k, c.size[1] * k), Image.LANCZOS)
date, tm = cut(1960, 1860, 2160, 1960), cut(1560, 2150, 1960, 2240)
canvas = Image.new('L', (max(date.size[0], tm.size[0]), date.size[1] + tm.size[1] + 20), 255)
canvas.paste(date, (0, 0)); canvas.paste(tm, (0, date.size[1] + 20))
save(canvas, 'ny-gb-1900-v2-p732-digits-x5.png')      # top: the year '1863.' (the 3 of the year); bottom: '10:30 A. M.' (the same glyph after the colon)

# 3. Sanitary Commission report on Gettysburg (New York, 1863; reportonoperatio00doug), pages 14, 15 and 24 (PDF pages 16, 17, 26) at 110 dpi
for pdfpage, name in ((16, 'ussc-1863-p14.png'), (17, 'ussc-1863-p15.png'), (26, 'ussc-1863-p24.png')):
    im = render(os.path.join(DL, 'reportonoperatio00doug/reportonoperatio00doug.pdf'), pdfpage, 110, 'ussc_%d' % pdfpage)
    save(im, name)
print('done')
