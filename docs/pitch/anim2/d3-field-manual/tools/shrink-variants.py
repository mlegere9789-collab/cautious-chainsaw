"""tools/shrink-variants.py - the three variant pictures (V1 day, V2 colour-blind safe, V3 high contrast) are extras, not scenes of the brief: their whole frames are kept as JPEG (quality 90, full 2880 x 1800)
and only their 100-percent crops stay PNG.  The nine scenes of the brief are PNG, untouched.   python tools/shrink-variants.py"""
import os, glob
from PIL import Image
SH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shots')
for f in sorted(glob.glob(os.path.join(SH, 'V*-*.png'))):
    if f.endswith('-crop.png'): continue
    d = f[:-4] + '.jpg'; Image.open(f).convert('RGB').save(d, quality=90, optimize=True); os.remove(f); print('wrote', os.path.basename(d), os.path.getsize(d) // 1024, 'KB')
