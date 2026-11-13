"""Dump whole OR reports (normalised view) to tmp/terrain-2/dump/<id>.txt and print their size.  python3 -I dump_or.py R098 R076 ...  (ids of vol. 27 pt.1; prefix OR27-2- for part 2)"""
import sys, os, bisect, textwrap
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tlib
OUT = os.path.join(tlib.ROOT, 'tmp/terrain-2/dump'); os.makedirs(OUT, exist_ok=True)
for rid in sys.argv[1:]:
    full = rid if rid.startswith('OR27') else 'OR27-1-' + rid
    r = tlib.OR_BY_ID[full]; P = tlib.get_part(r['part'])
    s = bisect.bisect_left(P.nmap, r['start_offset']); e = bisect.bisect_left(P.nmap, r['end_offset'])
    nt = P.ntext[s:e]
    with open(os.path.join(OUT, full + '.txt'), 'w', encoding='utf-8') as f:
        f.write('%s | %s %s | start_offset %d end_offset %d\n\n' % (full, r.get('rank') or '', r.get('author') or '', r['start_offset'], r['end_offset']))
        f.write(textwrap.fill(nt, 180))
    print(full, len(nt), r.get('rank'), r.get('author'))
