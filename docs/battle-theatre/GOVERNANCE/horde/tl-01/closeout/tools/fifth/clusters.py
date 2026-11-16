"""Distinct passages around a keyword regex in the saved 1863 newspaper pages (fifth start of tl-01).
usage: python3 -I clusters.py OUT REGEX D0 D1 [CTX]
Windows around each hit are merged per page; windows that share >= 40 percent of their 5-word shingles with an earlier window are listed as copies of it."""
import sys, re, glob, os, json
L = '/home/user/cautious-chainsaw/tmp/library/web/ca/pages'
def norm(t):
    t = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', t)
    return re.sub(r'\s+', ' ', t)
out, pat, d0, d1 = sys.argv[1:5]
ctx = int(sys.argv[5]) if len(sys.argv) > 5 else 350
rx = re.compile(pat, re.I)
wins = []   # (date, lccn, seq, start, end, text)
for p in sorted(glob.glob(L + '/*/*/ed-*/seq-*.txt')):
    m = re.search(r'/(sn\d+)/(\d{4}-\d\d-\d\d)/ed-(\d+)/seq-(\d+)\.txt', p)
    lccn, date, ed, seq = m.groups()
    if date < d0 or date > d1: continue
    t = norm(open(p, encoding='utf-8', errors='replace').read())
    spans = []
    for h in rx.finditer(t):
        a, b = max(0, h.start() - ctx), min(len(t), h.end() + ctx)
        if spans and a <= spans[-1][1]: spans[-1][1] = b
        else: spans.append([a, b])
    for a, b in spans:
        wins.append((date, lccn, int(seq), a, b, t[a:b]))
def sh(s):
    w = re.findall(r'[a-z0-9]+', s.lower())
    return set(tuple(w[i:i + 5]) for i in range(max(0, len(w) - 4)))
groups = []
for w in wins:
    s = sh(w[5])
    for g in groups:
        inter = len(s & g['sh'])
        if s and inter / max(1, min(len(s), len(g['sh']))) >= 0.4:
            g['copies'].append(w); g['sh'] |= s
            break
    else:
        groups.append(dict(first=w, copies=[], sh=s))
with open(out, 'w', encoding='utf-8') as f:
    f.write('# %s | %s..%s | windows %d | distinct %d\n' % (pat, d0, d1, len(wins), len(groups)))
    for i, g in enumerate(groups, 1):
        w = g['first']
        cp = ', '.join('%s %s p%d@%d' % (c[1], c[0], c[2], c[3]) for c in g['copies'])
        f.write('\n=== G%d | %s %s p%d @%d-%d%s\n%s\n' % (i, w[1], w[0], w[2], w[3], w[4], (' | copies: ' + cp) if cp else '', w[5]))
print('windows', len(wins), 'distinct', len(groups))
