"""Neighbouring leaf heads of an archive.org item: python3 -I tmp/tl-03/audit/neigh.py <ident> <local text path> <leaf> [radius]"""
import os, sys, re, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
spec = importlib.util.spec_from_file_location('lp', os.path.join(HERE, 'libpages3.py')); lp = importlib.util.module_from_spec(spec); sys.argv = [sys.argv[0]] + sys.argv[1:]
ident, path, leafarg = sys.argv[1], sys.argv[2], sys.argv[3]; rad = int(sys.argv[4]) if len(sys.argv) > 4 else 3
sys.argv = [sys.argv[0]]
spec.loader.exec_module(lp)
lm = lp.leafmap(ident, os.path.join(ROOT, path))
sh = lp.best_shift(lm)
print('shift', sh)
starts = dict(lm['leaves'])
import bisect
if leafarg.startswith('@'):
    offs = [x[1] for x in lm['leaves']]; leaf = lm['leaves'][bisect.bisect_right(offs, int(leafarg[1:])) - 1][0]; print('offset', leafarg, 'is on leaf', leaf)
else:
    leaf = int(leafarg)
for l in range(leaf - rad, leaf + rad + 1):
    if l not in starts: print(l, 'no text leaf'); continue
    head, cs = lp.head_cands(lm['djvu'][starts[l]:starts[l] + 160])
    print(l, '| index', lm['page_of'].get(l + sh[0]), '| cands', cs, '|', head[:90])
