#!/usr/bin/env python3
"""Reading helpers for the acquired texts (tmp/library/web/nps/<ID>/<ID>.txt).

  python3 -I pg.py show <ID> <from> [<to>] [--layout]     print PDF pages from..to
  python3 -I pg.py grep <regex> [<ID> ...] [--ctx N] [--max N]   search (case-insensitive), one hit per line:
                                                          ID p.<pdf page> | snippet
  python3 -I pg.py count <regex> [<ID> ...]                hits per document
Pages are PDF page indexes (the '=== PAGE n ===' markers), not printed page numbers.
"""
import glob, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..', '..', '..'))
BASES = [os.path.join(ROOT, 'tmp', 'library', 'web', 'nps'), os.path.join(ROOT, 'tmp', 'library', 'web', 'nps', 'pages')]


def path_of(sid, layout=False):
    for b in BASES:
        p = os.path.join(b, sid, sid + ('.layout.txt' if layout else '.txt'))
        if os.path.exists(p):
            return p
    raise SystemExit('no text for ' + sid)


def pages_of(sid, layout=False):
    txt = open(path_of(sid, layout), encoding='utf-8').read()
    parts = re.split(r'^=== PAGE (\d+) ===\n', txt, flags=re.M)
    out = {}
    for i in range(1, len(parts), 2):
        out[int(parts[i])] = parts[i + 1]
    return out


def all_ids():
    ids = []
    for b in BASES:
        for d in sorted(glob.glob(os.path.join(b, '*'))):
            sid = os.path.basename(d)
            if os.path.exists(os.path.join(d, sid + '.txt')):
                ids.append(sid)
    return ids


def main():
    a = sys.argv[1:]
    if not a:
        raise SystemExit(__doc__)
    cmd = a[0]
    layout = '--layout' in a
    a = [x for x in a if x != '--layout']
    if cmd == 'show':
        sid, lo = a[1], int(a[2])
        hi = int(a[3]) if len(a) > 3 else lo
        pg = pages_of(sid, layout)
        for n in range(lo, hi + 1):
            print('=== PAGE %d ===' % n)
            print(pg.get(n, '(no such page)'))
    elif cmd in ('grep', 'count'):
        ctx, mx = 110, 400
        if '--ctx' in a:
            i = a.index('--ctx'); ctx = int(a[i + 1]); del a[i:i + 2]
        if '--max' in a:
            i = a.index('--max'); mx = int(a[i + 1]); del a[i:i + 2]
        rx = re.compile(a[1], re.I)
        ids = a[2:] or all_ids()
        n = 0
        for sid in ids:
            c = 0
            for p, t in sorted(pages_of(sid).items()):
                flat = re.sub(r'\s+', ' ', t)
                for m in rx.finditer(flat):
                    c += 1
                    if cmd == 'grep' and n < mx:
                        s = max(0, m.start() - ctx); e = min(len(flat), m.end() + ctx)
                        print('%s p.%d | %s' % (sid, p, flat[s:e]))
                        n += 1
            if cmd == 'count' and c:
                print('%6d  %s' % (c, sid))
    else:
        raise SystemExit(__doc__)


def digest(sid, lo, hi, rx, layout=False):
    """Print, for pages lo..hi, only the sentences that match rx (with page numbers).
    A reading aid for long feature lists; quotes are always re-checked against the page text."""
    pgs = pages_of(sid, layout)
    r = re.compile(rx, re.I)
    for n in range(lo, hi + 1):
        flat = re.sub(r'\s+', ' ', pgs.get(n, ''))
        sents = re.split(r'(?<=[.!?\)])\s+(?=[A-Z_\-(“"])', flat)
        hits = [s for s in sents if r.search(s)]
        if hits:
            print('--- p.%d' % n)
            for s in hits:
                print('  ' + s)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'digest':
        a = [x for x in sys.argv[1:] if x != '--layout']
        digest(a[1], int(a[2]), int(a[3]), a[4] if len(a) > 4 else r'1863|battle|historic', '--layout' in sys.argv)
    else:
        main()
