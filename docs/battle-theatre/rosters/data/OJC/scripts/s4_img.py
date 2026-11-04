import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ojc_common import *
# usage: s4_img.py ID idx [idx...]   (idx = djvu index, 1-based; image n = idx-1)
i = sys.argv[1]
for idx in sys.argv[2:]:
    n = int(idx) - 1
    p = polite_get('https://archive.org/download/%s/page/n%d_w1500.jpg' % (i, n), 'img_%s_%d.jpg' % (i, int(idx)))
    print(p, os.path.getsize(p) if p else None)
