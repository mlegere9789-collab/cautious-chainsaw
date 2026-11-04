import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ojc_common import *
for i in sys.argv[1:]:
    p = polite_get('https://archive.org/download/%s/%s_djvu.xml' % (i, i), '%s_djvu.xml' % i, timeout=300)
    print(i, p and os.path.getsize(p), flush=True)
