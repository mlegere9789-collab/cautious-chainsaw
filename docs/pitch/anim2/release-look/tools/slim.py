"""slim.py - keeps the pictures of this folder small enough to commit (the raw DPR 2 stills are 4 to 6 MB each; 600 MB for six rounds of two options).
   iter-N folders: the whole picture becomes a 1440 px JPEG (q85), the 100 % crop a JPEG (q85), the 200 % crop is dropped (it is for the final only).
   final folders: the whole picture becomes a full-size JPEG (q92); the 100 % crop and the 200 % crop stay PNG (they exist to show edges).
   python tools/slim.py"""
import os, sys
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shots'); saved = 0; n = 0
for opt in ('a-standards', 'b-glyph'):
    base = os.path.join(ROOT, opt)
    for it in sorted(os.listdir(base)):
        d = os.path.join(base, it)
        if not os.path.isdir(d): continue
        final = it == 'final'
        if final and '--no-final' in sys.argv: continue
        for f in sorted(os.listdir(d)):
            p = os.path.join(d, f)
            if not f.endswith('.png'): continue
            before = os.path.getsize(p); stem = f[:-4]
            if stem.endswith('-crop-200pct'):
                if not final: os.remove(p); saved += before; n += 1
                continue
            if stem.endswith('-crop'):
                if final: continue
                Image.open(p).convert('RGB').save(os.path.join(d, stem + '.jpg'), quality=85, optimize=True)
            else:
                im = Image.open(p).convert('RGB')
                if not final and im.width > 1440: im = im.resize((1440, round(im.height * 1440 / im.width)), Image.LANCZOS)
                im.save(os.path.join(d, stem + '.jpg'), quality=92 if final else 85, optimize=True)
            os.remove(p); saved += before - os.path.getsize(os.path.join(d, stem + '.jpg')); n += 1
print('slimmed', n, 'files, saved', round(saved / 1e6), 'MB')
