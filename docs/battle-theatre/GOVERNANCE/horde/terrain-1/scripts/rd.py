"""Read a window of a source text.  python3 -I rd.py lib SID "anchor regex" [before after] | nps SID "anchor" [before after] | or REPORT-ID "anchor" [before after]"""
import sys, os, re, textwrap
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tlib
mode, sid, pat = sys.argv[1:4]
b = int(sys.argv[4]) if len(sys.argv) > 4 else 600
a = int(sys.argv[5]) if len(sys.argv) > 5 else 3000
occ = 0
if '--occ' in sys.argv:
    occ = int(sys.argv[sys.argv.index('--occ') + 1])
if mode == 'lib':
    p, raw, nt, nm = tlib.lib_text(sid)
elif mode == 'nps':
    p, raw, nt, nm = tlib.nps_text(sid)
else:
    r = tlib.OR_BY_ID[sid]; P = tlib.get_part(r['part'])
    import bisect
    s = bisect.bisect_left(P.nmap, r['start_offset']); e = bisect.bisect_left(P.nmap, r['end_offset'])
    nt = P.ntext[s:e]
ms = list(re.finditer(pat, nt, re.I))
if not ms:
    print('NO MATCH'); sys.exit(1)
print('matches:', len(ms))
m = ms[occ]
print(textwrap.fill(nt[max(0, m.start() - b): m.end() + a], 200))
