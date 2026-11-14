"""Crop the left part (names and residence) of a rendered page view for a names-level check: qa_left.py PAGE_ID [X0 X1 Y0 Y1] (fractions)."""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_render as RN
import qa_lib as Q
from PIL import Image
pid = sys.argv[1]
x0, x1, y0, y1 = [float(v) for v in sys.argv[2:6]] if len(sys.argv) >= 6 else (0.05, 0.50, 0.10, 0.97)
src = os.path.join(RN.IMG, RN.page_stem(pid) + '.png')
im = Image.open(src)
W, H = im.size
c = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
out = os.path.join(RN.IMG, RN.page_stem(pid) + '-left.png')
c.save(out)
print(out, c.size)
