#!/usr/bin/env python3
"""Find a passage in the content-stream-order (raw) text of a saved PDF and print its PDF page and the surrounding text.
  rawfind.py ID REGEX [BEFORE AFTER]     (variant: raw; add -S for the standard text, -O for the OCR text)
Reading aid for writing extract definitions; run with python3 -I."""
import importlib.util, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('be', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(spec); spec.loader.exec_module(be)
a = sys.argv[1:]
variant = 'raw'
for f, v in (('-S', None), ('-O', 'ocr'), ('-L', 'layout')):
    if f in a:
        a.remove(f); variant = v
sid, rx = a[0], a[1]
before = int(a[2]) if len(a) > 2 else 200
after = int(a[3]) if len(a) > 3 else 700
pgs, _, _ = be.pages(sid, variant)
for p in sorted(pgs):
    flat = be.norm(pgs[p])
    for m in re.finditer(rx, flat, re.I):
        print('--- %s p.%d @%d' % (sid, p, m.start()))
        print(flat[max(0, m.start() - before):m.end() + after])
        print()
