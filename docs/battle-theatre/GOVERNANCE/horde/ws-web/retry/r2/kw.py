#!/usr/bin/env python3
"""kw.py: compact keyword-in-context over saved texts.  python3 -I kw.py <regex> <ctx> <max_per_file> file1 [file2 ...]
Files may be F-ids (F-301) -> every *.txt below tmp/library/web/retry/F-301; or paths."""
import glob, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 7)))
rx = re.compile(sys.argv[1], re.I | re.S)
ctx, mx = int(sys.argv[2]), int(sys.argv[3])
files = []
for a in sys.argv[4:]:
    if re.fullmatch(r'F-\d+', a):
        d = os.path.join(ROOT, 'tmp/library/web/retry', a)
        files += [p for p in sorted(glob.glob(d + '/*')) if p.endswith('.txt') or p.endswith('.htm.txt') or p.endswith('.html.txt')]
    else:
        files.append(a)
for f in files:
    t = open(f, encoding='utf-8', errors='replace').read()
    n = 0
    for m in rx.finditer(t):
        n += 1
        if n <= mx:
            s = re.sub(r'\s+', ' ', t[max(0, m.start() - ctx):m.end() + ctx])
            print('%s @%d: ...%s...' % (os.path.relpath(f, ROOT).replace('tmp/library/web/retry/', ''), m.start(), s))
    if n:
        print('   [%d match(es) in %s]' % (n, os.path.basename(f)))
