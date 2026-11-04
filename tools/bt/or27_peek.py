"""python -I tools/bt/or27_peek.py OR27-2-R461 "regex" [width] : print the normalized text around each regex match inside one record (what anchors must match)."""
import os, re, sys, bisect, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import or27_find as F
from or27_lib import INDEX_PATH, utf8_stdout
utf8_stdout()
IDX = {r['id']: r for r in json.load(open(INDEX_PATH, encoding='utf-8'))['records']}
rid, rx = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 100
if rid.startswith('R'): rid = 'OR27-2-' + rid
r = IDX[rid]; P = F.get_part(r['part'])
a = bisect.bisect_left(P.nmap, r['start_offset']); b = bisect.bisect_left(P.nmap, r['end_offset'])
seg = P.ntext[a:b]
for m in re.finditer(rx, seg, re.I):
    print(repr(seg[max(0, m.start() - w):m.end() + w]))
