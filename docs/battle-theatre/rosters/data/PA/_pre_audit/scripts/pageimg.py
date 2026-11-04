"""fetch a page image for QA: pageimg.py <ident> <djvu page idx 1-based> -> prints path"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C
ident, idx = sys.argv[1], int(sys.argv[2])
p = C.fetch('https://archive.org/download/%s/page/n%d_w1200.jpg' % (ident, idx - 1), 'img/%s_n%d.jpg' % (ident, idx - 1))
print(p)
