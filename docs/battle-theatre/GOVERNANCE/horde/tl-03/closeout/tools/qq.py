"""Check many quotes at once: reads lines 'REPORT|PAGE|quote' or 'LIB:SID|quote' from a file or stdin. Prints OK/MISSING and the found report/page."""
import os, sys, re
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt')); sys.path.insert(0, os.path.join(ROOT, 'tmp', 'tl-03', 'tools'))
from or27_lib import norm_query
import or27_find as F
import ws9lib as W
for line in sys.stdin:
    line = line.rstrip('\n')
    if not line.strip() or line.startswith('#'): continue
    parts = line.split('|', 2)
    if parts[0].startswith('LIB:'):
        sid = parts[0][4:]; q = norm_query(line.split('|', 1)[1])
        hs = W.find(sid, q)
        print(('OK   ' if hs else 'MISS ') + sid + ' ' + (str(hs[:2]) if hs else '') + ' :: ' + q[:90])
        continue
    rep, page, q = parts[0], parts[1], norm_query(parts[2])
    hs = F.verify(q)
    sel = [h for h in hs if (not rep or h['record'].endswith(rep))]
    if sel:
        print('OK   %s p.%s @%d :: %s' % (sel[0]['record'], sel[0]['page'], sel[0]['start'], q[:90]) + ('' if (not page or page in str(sel[0]['page'])) else '   <<< PAGE DIFFERS from stated %s' % page) + ('   [x%d]' % len(sel) if len(sel) > 1 else ''))
    else:
        print('MISS %s :: %s' % ('(found elsewhere: %s)' % sorted(set(h['record'] for h in hs)) if hs else '', q[:100]))
