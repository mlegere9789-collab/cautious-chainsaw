import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ojc_common import *
ids = sys.argv[1:]
for i in ids:
    p = polite_get('https://archive.org/download/%s/%s_djvu.txt' % (i, i), '%s_djvu.txt' % i, timeout=120)
    print(i, p and os.path.getsize(p), flush=True)
