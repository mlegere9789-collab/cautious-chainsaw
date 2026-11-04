"""python -I tools/bt/recheck_D_grep.py RECORD_ID regex [width=260]  -- print matches of a regex in the normalised text of one OR record"""
import sys, os, re, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import positions_build as B
rec, rx = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 260
r = B.IDX[rec]; P = B.F.get_part(r['part'])
a = bisect.bisect_left(P.nmap, r['start_offset']); b = bisect.bisect_left(P.nmap, r['end_offset'])
seg = P.ntext[a:b]
for m in re.finditer(rx, seg):
    print('@%d: ...%s' % (m.start(), seg[max(0, m.start() - w):m.end() + w]))
    print()
