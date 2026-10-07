"""compose-compare.py - shots/compare-first-prototype-vs-quiet.png: the first prototype's War Room at tick 551, zoom 15 (its own picture, read-only) beside this skin at the same tick and camera.
   1. node tools/try.mjs --zoom=15 --tick=551 --name=compare-after          (writes shots/wip/compare-after.png, 1440 x 900, DPR 1)
   2. python tools/compose-compare.py [tiles-before] [marks-after]            (the two numbers are read off the two pictures' own status lines and passed in)
The before picture is docs/pitch/anim/shots/prototype/app-war-room-fresh2-z15-paper.png.  Nothing is drawn but the two pictures and two lines of text (Liberation Sans, SIL OFL)."""
import sys, os
from PIL import Image, ImageDraw, ImageFont

D1 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(D1, '..', '..', '..', '..'))
before = Image.open(os.path.join(REPO, 'docs', 'pitch', 'anim', 'shots', 'prototype', 'app-war-room-fresh2-z15-paper.png')).convert('RGB')
after = Image.open(os.path.join(D1, 'shots', 'wip', 'compare-after.png')).convert('RGB')
tiles_before = sys.argv[1] if len(sys.argv) > 1 else '321'
marks_after = sys.argv[2] if len(sys.argv) > 2 else '353'
W, H = before.size
assert after.size == (W, H), (before.size, after.size)
M = 24; TOP = 108
canvas = Image.new('RGB', (2 * W + 3 * M, H + TOP + M), (10, 14, 21))
canvas.paste(before, (M, TOP)); canvas.paste(after, (2 * M + W, TOP))
d = ImageDraw.Draw(canvas)
bold = ImageFont.truetype('C:/Windows/Fonts/LiberationSans-Bold.ttf', 28); reg = ImageFont.truetype('C:/Windows/Fonts/LiberationSans-Regular.ttf', 21)
d.text((M, 20), f'Before (the first prototype, War Room) and after (Quiet Cartographer): tick 551, zoom 15, {W} x {H}, DPR 1', font=bold, fill=(255, 255, 255))
d.text((M, 62), f'Left: {tiles_before} tiles, each unit two boxes (a plate and a caption chip).  Right: one mark per unit, a standard per formation or crowd, on the real aerial ({marks_after} marks).', font=reg, fill=(170, 180, 192))
out = os.path.join(D1, 'shots', 'compare-first-prototype-vs-quiet.png')
canvas.save(out, optimize=True); print(out, canvas.size)
