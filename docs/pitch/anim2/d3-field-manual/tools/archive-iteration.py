"""tools/archive-iteration.py - keep the evidence of an iteration small: every shots/<tag>-<scene>.png of the tag becomes a 1440-px JPEG (quality 82) in shots/iterations/, the PNG is deleted.
python tools/archive-iteration.py i1 [i1b i2 ...]    (the final pictures are never touched: they carry no tag)"""
import sys, os, glob
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(HERE, '..', 'shots'); OUT = os.path.join(SH, 'iterations'); os.makedirs(OUT, exist_ok=True)
for tag in sys.argv[1:]:
    for f in sorted(glob.glob(os.path.join(SH, tag + '-*.png'))):
        base = os.path.basename(f)[len(tag) + 1:-4]
        if base.endswith('-crop'):
            os.remove(f); continue                       # the 100-percent crops are regenerated with every run; only the whole pictures are kept as evidence
        im = Image.open(f).convert('RGB'); w = 1440 if im.width > 1500 else im.width; im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS) if w != im.width else im
        d = os.path.join(OUT, f'{tag}-{base}.jpg'); im.save(d, quality=82, optimize=True); os.remove(f); print('kept', os.path.basename(d), os.path.getsize(d) // 1024, 'KB')
