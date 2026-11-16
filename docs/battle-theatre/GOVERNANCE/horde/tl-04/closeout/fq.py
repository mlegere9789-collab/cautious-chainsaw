"""Verbatim span between two phrases in the normalised text of a source:  python3 -I tmp/tl-04/fq.py SID "start phrase" ["end phrase"] [maxlen]
Prints the span (start phrase .. end phrase inclusive) or, without an end phrase, maxlen (default 400) characters from the start."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ws9find as W
from or27_lib import norm_query
sid, a = sys.argv[1], sys.argv[2]
b = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].isdigit() else None
n = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 400
text, nt, nm, path = W.load(sid)
q = norm_query(a).translate(W.APOS)
i = nt.find(q)
if i < 0:
    print('START NOT FOUND'); sys.exit(2)
cnt = nt.count(q)
if b:
    j = nt.find(norm_query(b).translate(W.APOS), i)
    if j < 0:
        print('END NOT FOUND'); sys.exit(2)
    seg = nt[i:j + len(norm_query(b))]
else:
    seg = nt[i:i + n]
print('[%s occurrences of start: %d; raw offset %d]' % (sid, cnt, nm[i]))
print(seg)
