import sys, re
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from plan_lib import load_pages, fold
pages = load_pages()
needle = fold(sys.argv[1]); width = int(sys.argv[2]) if len(sys.argv) > 2 else 300
hits = 0
for n in sorted(pages):
    f = fold(pages[n])
    for m in re.finditer(re.escape(needle), f):
        a = max(0, m.start() - width); b = min(len(f), m.end() + width)
        print(f'--- p{n}: ...{f[a:b]}...'); hits += 1
        if hits >= 6: sys.exit()
if not hits: print('NO HIT for', needle)
