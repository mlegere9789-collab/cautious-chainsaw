"""Logged search for shard tl-01 close-out.
  python3 -I tmp/tl-01/tools/s.py ROWS SCOPE 'regex' [-C 200] [--max 8] [--ids A,B] [--note text]
SCOPE: or (OR vol.27 parts 1-3), or1/or2/or3, lib (all local library texts), both.
Appends one JSON line per call to GOVERNANCE/horde/tl-01/closeout/search_log.jsonl (pattern, scope, hit counts per source)."""
import os, re, sys, json, pickle, time, argparse, collections
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
sys.path.insert(0, os.path.join(ROOT, 'tmp', 'tl-01', 'tools'))
LOG = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout/search_log.jsonl')
CACHE = os.path.join(ROOT, 'tmp', 'tl-01', 'cache', 'light.pkl')

def light():
    import ws9lib as W
    if os.path.exists(CACHE):
        return pickle.load(open(CACHE, 'rb'))
    d = {}
    for sid in sorted(W.ITEMS):
        p = W.path_of(sid)
        if not os.path.exists(p): continue
        t = open(p, encoding='utf-8', newline='').read()
        t = re.sub(r'(?<=[A-Za-z])-\s*\n\s*(?=[a-z])', '', t)
        t = re.sub(r'\s+', ' ', t)
        d[sid] = t
    pickle.dump(d, open(CACHE, 'wb'), protocol=4)
    return d

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('rows'); ap.add_argument('scope'); ap.add_argument('pattern')
    ap.add_argument('-C', type=int, default=200); ap.add_argument('--max', type=int, default=8)
    ap.add_argument('--ids', default=''); ap.add_argument('--note', default=''); ap.add_argument('--case', action='store_true')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()
    flags = 0 if a.case else re.I
    counts = collections.OrderedDict()
    out = []
    if a.scope in ('or', 'both', 'or1', 'or2', 'or3'):
        import or27_find as F
        parts = {'or1': (1,), 'or2': (2,), 'or3': (3,)}.get(a.scope, (1, 2, 3))
        rx = re.compile(a.pattern, flags)
        for p in parts:
            P = F.get_part(p)
            n = 0
            for m in rx.finditer(P.ntext):
                if m.end() == m.start(): continue
                n += 1
                if n <= a.max:
                    os_, oe = P.orig_span(m.start(), m.end())
                    c = P.cite(os_, oe)
                    s = max(0, m.start() - a.C); e = min(len(P.ntext), m.end() + a.C)
                    out.append('[OR27 pt.%d %s p.%s @%d] ...%s<<%s>>%s...' % (p, c['who'][:60], c['page'], os_, P.ntext[s:m.start()], m.group(0), P.ntext[m.end():e]))
            counts['OR27 pt.%d' % p] = n
    if a.scope in ('lib', 'both'):
        d = light()
        ids = [x for x in a.ids.split(',') if x] or sorted(d)
        rx = re.compile(a.pattern, flags)
        nfiles = 0
        for sid in ids:
            t = d[sid]; n = 0
            for m in rx.finditer(t):
                n += 1
                if n <= a.max:
                    s = max(0, m.start() - a.C); e = min(len(t), m.end() + a.C)
                    out.append('[%s ~%d] ...%s<<%s>>%s...' % (sid, m.start(), t[s:m.start()], m.group(0), t[m.end():e]))
            if n: counts[sid] = n
            nfiles += 1
        counts['_library_files_searched'] = nfiles
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'rows': a.rows.split(','), 'scope': a.scope, 'pattern': a.pattern,
           'case_sensitive': bool(a.case), 'ids': a.ids or None, 'hits': counts, 'note': a.note}
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    if not a.quiet:
        for o in out: print(o); print()
    print('HITS', json.dumps(counts))

if __name__ == '__main__':
    main()
