"""Count hits of a regex per corpus (for the lookups records).  python3 -I cnt.py "regex" -> OR parts 1,2,3 / library books (newspapers excluded) / NPS texts, with the files that have hits."""
import sys, re, os, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tlib
pat = sys.argv[1]
rx = re.compile(pat, re.I)
tot = {}
for p in (1, 2, 3):
    P = tlib.get_part(p)
    tot['OR27-%d' % p] = len(rx.findall(P.ntext))
lib = collections.OrderedDict()
for sid in sorted(tlib.lib_ids()):
    if sid.startswith(('ADAMS-SENTINEL', 'GBG-COMPILER')): continue
    try:
        n = len(rx.findall(tlib.lib_text(sid)[2]))
    except Exception as e:
        n = -1
    if n: lib[sid] = n
nps = collections.OrderedDict()
for sid in tlib.nps_ids():
    try:
        n = len(rx.findall(tlib.nps_text(sid)[2]))
    except Exception as e:
        n = -1
    if n: nps[sid] = n
print('OR', tot)
print('LIB total', sum(lib.values()), 'in', len(lib), 'books:', dict(lib))
print('NPS total', sum(nps.values()), 'in', len(nps), 'texts:', dict(list(nps.items())[:40]))
