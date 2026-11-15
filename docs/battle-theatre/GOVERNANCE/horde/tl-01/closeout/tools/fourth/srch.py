"""Search helper for the fourth start of tl-01 (reads local texts only).
usage: python3 -I srch.py CORPUS REGEX [CTX] [MAXHITS] [DATEFROM] [DATETO]
CORPUS: ca | town | nps | med | ws9 | all
Whitespace and line-break hyphenation are normalised (offsets refer to the normalised text, printed with the file)."""
import sys, re, os, glob, json
ROOT = '/home/user/cautious-chainsaw'
L = ROOT + '/tmp/library'
def files(corpus):
    out = []
    if corpus in ('ca', 'all'):
        out += sorted(glob.glob(L + '/web/ca/pages/*/*/ed-*/seq-*.txt'))
    if corpus in ('town', 'all'):
        for d in ('HOKE-1887', 'HISTORY-ADAMS-1886', 'CONEWAGO-REILY-1885', 'BARTON-ANGELS-1898', 'WARCLAIMS-CHURCHES-1912', 'WARREN-1869', 'RUPP-1846'):
            out += sorted(glob.glob(L + '/town/' + d + '/*_djvu.txt'))
        out += sorted(glob.glob(L + '/town/ADAMS-SENTINEL-OTHER/*1863*.txt')) + sorted(glob.glob(L + '/town/ADAMS-SENTINEL-OTHER/*1864*.txt'))
        out += sorted(glob.glob(L + '/town/GBG-COMPILER-OTHER/*1863*.txt')) + sorted(glob.glob(L + '/town/GBG-COMPILER-OTHER/*1864*.txt'))
    if corpus in ('nps', 'all'):
        out += sorted(p for p in glob.glob(L + '/web/nps/*/*.txt') if not re.search(r'\.(layout|raw)\.txt$', p))
    if corpus in ('med', 'all'):
        out += sorted(glob.glob(L + '/medical/**/*.txt', recursive=True))
    if corpus in ('ws9', 'all'):
        out += sorted(glob.glob(L + '/ws9/*.txt'))
    return out
def norm(t):
    t = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', t)
    return re.sub(r'\s+', ' ', t)
def label(p):
    m = re.search(r'/ca/pages/(sn\d+)/(\d{4}-\d\d-\d\d)/ed-(\d+)/seq-(\d+)\.txt', p)
    if m: return 'CA %s %s ed%s seq%s' % m.groups()
    return os.path.relpath(p, L)
if __name__ == '__main__':
    corpus, pat = sys.argv[1], sys.argv[2]
    ctx = int(sys.argv[3]) if len(sys.argv) > 3 else 200
    mx = int(sys.argv[4]) if len(sys.argv) > 4 else 40
    d0 = sys.argv[5] if len(sys.argv) > 5 else None
    d1 = sys.argv[6] if len(sys.argv) > 6 else None
    rx = re.compile(pat, re.I)
    n = 0; nf = 0
    for p in files(corpus):
        if d0 or d1:
            m = re.search(r'(\d{4}-\d\d-\d\d)', p)
            if m:
                if d0 and m.group(1) < d0: continue
                if d1 and m.group(1) > d1: continue
        try:
            t = norm(open(p, encoding='utf-8', errors='replace').read())
        except Exception as e:
            continue
        hits = list(rx.finditer(t))
        if not hits: continue
        nf += 1
        last = -10**9
        for m in hits:
            if m.start() - last < ctx: continue
            last = m.start()
            n += 1
            if n <= mx:
                print('--- %s @%d' % (label(p), m.start()))
                print('   ' + t[max(0, m.start() - ctx):m.end() + ctx])
    print('TOTAL distinct hits %d in %d files (shown up to %d)' % (n, nf, mx))
