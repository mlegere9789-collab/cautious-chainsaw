"""compose-compare.py - one contact sheet of the two options side by side, scene by scene, from the final stills (JPEG q88, 1100 px per picture): shots/compare-A-vs-B.jpg.
   python tools/compose-compare.py"""
import os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', 'shots')
ROWS = [('Opening view, zoom 13.5, a mid-battle tick (Day 2, tick 295)', 's1a-opening-z13.5-midbattle-t295.png'), ('Opening view, zoom 13.5, the Day 3 assault (tick 556)', 's1b-opening-z13.5-day3-assault-t556.png'),
        ('Wheatfield and Rose Woods, zoom 15', 's2-wheatfield-rose-woods-z15-t295.png'), ('Close-up with a selected unit and its Inspect card, zoom 16.5', 's4-closeup-selected-z16.5-t551.png'),
        ('Legend', 's7-legend-t60.png'), ('Phone 390 x 844, zoom 14.5, bottom sheet', 's5-phone-z14.5-sheet-t551.png')]
W = 1100; PAD = 24; HEAD = 44
try: font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 22); small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 16)
except Exception: font = small = ImageFont.load_default()
def load(opt, name):
    p = os.path.join(ROOT, opt, 'final', name)
    if not os.path.exists(p): p = os.path.splitext(p)[0] + '.jpg'
    im = Image.open(p).convert('RGB'); w = W if im.width > im.height else 420; h = round(im.height * w / im.width)
    return im.resize((w, h), Image.LANCZOS)
rows = []
for title, name in ROWS:
    a = load('a-standards', name); b = load('b-glyph', name); rows.append((title, a, b))
H = PAD + 70 + sum(HEAD + max(r[1].height, r[2].height) + PAD for r in rows)
sheet = Image.new('RGB', (2 * W + 3 * PAD, H), (244, 244, 241)); d = ImageDraw.Draw(sheet)
d.text((PAD, PAD), 'Option A: Standards (left)    Option B: Glyph (right)', fill=(20, 24, 30), font=font); d.text((PAD, PAD + 32), 'Real stills from the final builds, DPR 2, shown at 1100 px wide; each picture is a settled frame of the engine.', fill=(70, 78, 88), font=small)
y = PAD + 70
for title, a, b in rows:
    d.text((PAD, y + 8), title, fill=(20, 24, 30), font=font); y += HEAD
    sheet.paste(a, (PAD, y)); sheet.paste(b, (2 * PAD + W, y)); y += max(a.height, b.height) + PAD
out = os.path.join(ROOT, 'compare-A-vs-B.jpg'); sheet.save(out, quality=88, optimize=True); print('wrote', out, sheet.size)
