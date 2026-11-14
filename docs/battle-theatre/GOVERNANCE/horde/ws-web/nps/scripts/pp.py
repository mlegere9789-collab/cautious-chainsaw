#!/usr/bin/env python3
"""Print the last and first tokens of pages (to find the printed page number a page shows): pp.py SRC p1 p2 ... [-R|-L]"""
import importlib.util, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(spec); spec.loader.exec_module(be)
sid = sys.argv[1]
variant = None
args = []
for a in sys.argv[2:]:
    if a == '-R': variant = 'raw'
    elif a == '-L': variant = 'layout'
    elif a == '-O': variant = 'ocr'
    else: args.append(a)
pgs = be.pages(sid, variant)[0]
for a in args:
    lo, _, hi = a.partition('-')
    for p in range(int(lo), int(hi or lo) + 1):
        t = be.norm(pgs.get(p, ''))
        print('p%d: first=%r last=%r' % (p, t[:40], t[-40:]))
