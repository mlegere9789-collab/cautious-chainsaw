#!/usr/bin/env python3
"""Print chosen sentences of a page with the builder's own sentence numbering: sent.py [-L|-R|-O] SRC PAGE s1[-s2] [s3 ...] [--w N]
(use the printed text to write '#sN-M' anchors or to copy a passage for a cleaned '=' quote)"""
import importlib.util, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(spec); spec.loader.exec_module(be)
a = sys.argv[1:]
variant = None
if a and a[0] in ('-L', '-R', '-O'):
    variant = {'-L': 'layout', '-R': 'raw', '-O': 'ocr'}[a[0]]; a = a[1:]
sid, page, *rest = a
w = 100000
if '--w' in rest:
    i = rest.index('--w'); w = int(rest[i + 1]); rest = rest[:i] + rest[i + 2:]
pgs = be.pages(sid, variant)[0]
sents = be.split_sentences(be.norm(pgs[int(page)]))
for r in rest:
    lo, _, hi = r.partition('-')
    for n in range(int(lo), int(hi or lo) + 1):
        print('p%s.s%d: %s' % (page, n, sents[n - 1][:w] if n <= len(sents) else '<none>'))
