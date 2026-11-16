"""Exact hit counts for the lookups records: python3 -I cnt2.py "regex" ...  prints OR parts 1-3, library (newspapers excluded), NPS texts (library only; the tmp/terrain-2/nps web copies excluded)."""
import sys, re, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tlib
ORP = {p: tlib.get_part(p).ntext for p in (1, 2, 3)}
LIBT = {}
for sid in sorted(tlib.lib_ids()):
    if sid.startswith(('ADAMS-SENTINEL', 'GBG-COMPILER', 'T-or27')): continue
    LIBT[sid] = tlib.lib_text(sid)[2]
NPST = {}
for sid in tlib.nps_ids():
    if sid.startswith('NPSWEB-'): continue
    NPST[sid] = tlib.nps_text(sid)[2]
for pat in sys.argv[1:]:
    rx = re.compile(pat, re.I)
    o = {p: len(rx.findall(t)) for p, t in ORP.items()}
    l = {k: len(rx.findall(t)) for k, t in LIBT.items()}; l = {k: v for k, v in l.items() if v}
    n = {k: len(rx.findall(t)) for k, t in NPST.items()}; n = {k: v for k, v in n.items() if v}
    print('PATTERN', pat)
    print('  OR', o, '| LIB', sum(l.values()), 'in', len(l), 'books | NPS', sum(n.values()), 'in', len(n), 'texts')
