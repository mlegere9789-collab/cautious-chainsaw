"""Batch search over the corpora that were not local when the earlier tl-01 passes searched (fourth start, 2026-11-15).
usage: python3 -I runsearch.py SPECFILE OUTFILE
SPECFILE: JSON list of {"rows": [...], "pattern": regex, "scopes": ["ca","town","nps","med","ws9"], "note": str, "ctx": int, "d0": date, "d1": date}
Writes the context windows to OUTFILE and a JSONL log line per spec to OUTFILE + '.log.jsonl'. Whitespace and line-break hyphenation are normalised."""
import sys, re, os, json, glob, time, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import srch
spec = json.load(open(sys.argv[1], encoding='utf-8'))
out = open(sys.argv[2], 'w', encoding='utf-8')
log = open(sys.argv[2] + '.log.jsonl', 'w', encoding='utf-8')
cache = {}
def text(p):
    if p not in cache:
        cache[p] = srch.norm(open(p, encoding='utf-8', errors='replace').read())
    return cache[p]
# corpora
corp = {k: srch.files(k) for k in ('ca', 'town', 'nps', 'med', 'ws9')}
for s in spec:
    rx = re.compile(s['pattern'], re.I)
    ctx = s.get('ctx', 220)
    d0, d1 = s.get('d0'), s.get('d1')
    out.write('\n######## %s | %s | %s\n' % (','.join(s['rows']), s['pattern'], s.get('note', '')))
    hits = {}
    for sc in s['scopes']:
        n = 0; nf = 0
        for p in corp[sc]:
            if sc == 'ca' and (d0 or d1):
                m = re.search(r'/(\d{4}-\d\d-\d\d)/', p)
                if m and ((d0 and m.group(1) < d0) or (d1 and m.group(1) > d1)): continue
            t = text(p)
            hs = list(rx.finditer(t))
            if not hs: continue
            nf += 1; last = -10 ** 9
            for m in hs:
                if m.start() - last < ctx: continue
                last = m.start(); n += 1
                out.write('--- [%s] %s @%d\n    %s\n' % (sc, srch.label(p), m.start(), t[max(0, m.start() - ctx):m.end() + ctx]))
        hits[sc] = {'windows': n, 'files': nf}
    out.write('==> %s\n' % json.dumps(hits))
    log.write(json.dumps({'ts': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'), 'rows': s['rows'], 'scope': '+'.join(s['scopes']), 'pattern': s['pattern'], 'case_sensitive': False, 'ids': None, 'hits': hits, 'note': s.get('note', '')}) + '\n')
    out.flush(); log.flush()
print('done', len(spec), 'specs')
