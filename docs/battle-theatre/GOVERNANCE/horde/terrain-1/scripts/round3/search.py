"""Search driver for the round-3 corpus (read-only). Usage: python3 -I search.py QUERYFILE [qid ...]
QUERYFILE defines Q = [dict(id, pat, key=[necessary literals, any of], lit=[words every file must contain], groups, ctx, maxn, per_file, note)].
For speed the regex runs only in windows around occurrences of a key literal (str.find on a lower-cased copy), never over the whole text:
every pattern must therefore contain at least one of its keys in every match. Writes hits/<qid>.txt and prints one summary line per query."""
import os, re, sys, pickle, importlib.util, time
ROOT = '/home/user/cautious-chainsaw'
R3 = os.path.join(ROOT, 'tmp/terrain-1/r3')
corpus = pickle.load(open(os.path.join(R3, 'corpus.pkl'), 'rb'))
spec = importlib.util.spec_from_file_location('q', sys.argv[1]); q = importlib.util.module_from_spec(spec); spec.loader.exec_module(q)
want = set(sys.argv[2:])
os.makedirs(os.path.join(R3, 'hits'), exist_ok=True)
low = {fid: t.lower() for fid, rel, g, h, t in corpus}
WL, WR = 750, 950
for Q in q.Q:
    if want and Q['id'] not in want: continue
    t0 = time.time()
    rx = re.compile(Q['pat'], re.I)
    groups = Q.get('groups', ('or27', 'ws9', 'nps', 'extra'))
    lit = [x.lower() for x in Q.get('lit', [])]
    keys = [k.lower() for k in Q['key']]
    ctx = Q.get('ctx', 260); maxn = Q.get('maxn', 40); per = Q.get('per_file', 5)
    out = []; nfiles = 0; total = 0
    for fid, rel, g, h, t in corpus:
        if g not in groups: continue
        tl = low[fid]
        if lit and not all(l in tl for l in lit): continue
        pos = []
        for k in keys:
            i = tl.find(k)
            while i >= 0:
                pos.append(i); i = tl.find(k, i + 1)
        if not pos: continue
        pos.sort()
        # merge windows
        wins = []
        for p in pos:
            a = max(0, p - WL); b = min(len(t), p + WR)
            if wins and a <= wins[-1][1]: wins[-1][1] = max(wins[-1][1], b)
            else: wins.append([a, b])
        seen = set(); k_in_file = 0
        for a, b in wins:
            for m in rx.finditer(t, a, b):
                if m.start() in seen: continue
                seen.add(m.start()); total += 1; k_in_file += 1
                if k_in_file <= per and len(out) < maxn:
                    c0 = max(0, m.start() - ctx); c1 = min(len(t), m.end() + ctx)
                    out.append('[%s | %s | off %d]\n   ...%s...\n' % (fid, g, m.start(), t[c0:c1]))
        if k_in_file: nfiles += 1
    with open(os.path.join(R3, 'hits', Q['id'] + '.txt'), 'w') as f:
        f.write('QUERY %s  %s\nNOTE %s\nTOTAL hits %d in %d files (shown %d)\n\n' % (Q['id'], Q['pat'], Q.get('note', ''), total, nfiles, len(out)))
        f.write('\n'.join(out))
    print('%-14s hits %4d files %3d  (%.1fs)  %s' % (Q['id'], total, nfiles, time.time() - t0, Q.get('note', '')[:70]))
