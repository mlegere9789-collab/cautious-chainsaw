#!/usr/bin/env python3
"""Cut a letterpress page of Gardner's Sketch Book (Library of Congress copy, 1024-px derivative) into readable strips (2x enlargement) for reading by eye.
Usage: python3 -I tools/bt/photomatch/sketch_strips.py <page image> <out prefix> [n_strips]
The strips are working copies for looking; the quoted words are transcribed by eye from them and are flagged 'read from the page image' wherever they are used."""
import sys
from PIL import Image
src, pre = sys.argv[1], sys.argv[2]; n = int(sys.argv[3]) if len(sys.argv) > 3 else 3
im = Image.open(src).convert('RGB'); w, h = im.size
x0, x1 = int(w * 0.10), int(w * 0.90); y0, y1 = int(h * 0.22), int(h * 0.95)
step = (y1 - y0) / n
for k in range(n):
    a = int(y0 + k * step - 8); b = int(y0 + (k + 1) * step + 8)
    c = im.crop((x0, max(0, a), x1, min(h, b))); c = c.resize((int(c.width * 2.0), int(c.height * 2.0)), Image.LANCZOS)
    c.save(f'{pre}_s{k + 1}.jpg', quality=92)
print(n, 'strips', c.size)
