"""zoom200.py - the 200-percent view of the busiest area: the middle 600 x 400 device pixels of the scene's 100-percent crop (1200 x 800 device pixels = 600 x 400 CSS px at DPR 2), enlarged x2 with
nearest-neighbour resampling, so a reviewer can inspect every edge as the pixels it is.   python tools/zoom200.py [round-1]"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rnd = sys.argv[1] if len(sys.argv) > 1 else 'round-1'
R = os.path.join(ROOT, 'shots', rnd)
src = os.path.join(R, 'S1b-field-z13.5-t556-assault.crop.png')
im = Image.open(src)
w, h = im.size
box = (w // 2 - 300, h // 2 - 200, w // 2 + 300, h // 2 + 200)
out = os.path.join(R, 'S1b-field-z13.5-t556-assault.busiest-200pct.png')
im.crop(box).resize((1200, 800), Image.NEAREST).save(out, optimize=True)
print('wrote', os.path.relpath(out, ROOT), (1200, 800))
