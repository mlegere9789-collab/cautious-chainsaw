"""Batch of logged searches (second pass of the tl-03 close-out).  python3 -I tmp/tl-03/audit/bs.py spec.py [out.txt]
spec.py defines SPECS = [dict(rows='T1-116', scope='or'|'or1'|'or2'|'or3'|'lib'|'both', pat=regex, note=why, ids='A,B' (optional), C=170, max=3), ...]
Loads the Official Records (parts 1-3, normalised view of tools/bt/or27_find.py) and the local library (the light cache of tmp/tl-03/tools/s.py plus the texts acquired by tl-02
that are not in it) ONCE; prints the hits of each search compactly and appends one line per search to horde/tl-03/closeout/search_log.jsonl."""
import os, re, sys, json, time, collections, importlib.util
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt')); sys.path.insert(0, os.path.join(ROOT, 'tmp', 'tl-03', 'tools'))
LOG = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/tl-03/closeout/search_log.jsonl')
spec_path = sys.argv[1]
out_path = sys.argv[2] if len(sys.argv) > 2 else None
sp = importlib.util.spec_from_file_location('spec', spec_path); mod = importlib.util.module_from_spec(sp); sp.loader.exec_module(mod)
import or27_find as F
spec_s = importlib.util.spec_from_file_location('s', os.path.join(ROOT, 'tmp/tl-03/tools/s.py')); S = importlib.util.module_from_spec(spec_s); spec_s.loader.exec_module(S)
NOLIB = bool(os.environ.get('BS_NOLIB'))
LIB = {} if NOLIB else S.light()
EXTRA = {}
acq = os.path.join(ROOT, 'tmp', 'tl-02', 'acq')
for sid in ([] if NOLIB else sorted(os.listdir(acq))):
    if sid.startswith(('CAVTACT', 'MCCLELLAN', 'TROOPER')): continue
    d = os.path.join(acq, sid)
    for fn in os.listdir(d):
        if fn.endswith('_djvu.txt'):
            t = open(os.path.join(d, fn), encoding='utf-8', newline='').read()
            t = re.sub(r'(?<=[A-Za-z])-\s*\n\s*(?=[a-z])', '', t); t = re.sub(r'\s+', ' ', t)
            EXTRA[sid] = t
LIB.update({k: v for k, v in EXTRA.items() if k not in LIB})
buf = []
def emit(s=''):
    print(s); buf.append(s)
nlog = 0
for sp_ in mod.SPECS:
    flags = 0 if sp_.get('case') else re.I
    rx = re.compile(sp_['pat'], flags); C = sp_.get('C', 170); mx = sp_.get('max', 3)
    counts = collections.OrderedDict(); hits = []
    sc = sp_['scope']
    if sc in ('or', 'both', 'or1', 'or2', 'or3'):
        parts = {'or1': (1,), 'or2': (2,), 'or3': (3,)}.get(sc, (1, 2, 3))
        for p in parts:
            P = F.get_part(p); n = 0
            for m in rx.finditer(P.ntext):
                if m.end() == m.start(): continue
                n += 1
                if n <= mx:
                    os_, oe = P.orig_span(m.start(), m.end()); c = P.cite(os_, oe)
                    s = max(0, m.start() - C); e = min(len(P.ntext), m.end() + C)
                    hits.append('  [OR27 pt.%d %s p.%s] ...%s<<%s>>%s...' % (p, c['who'][:50], c['page'], P.ntext[s:m.start()], m.group(0)[:200], P.ntext[m.end():e]))
            counts['OR27 pt.%d' % p] = n
    if sc in ('lib', 'both'):
        ids = [x for x in (sp_.get('ids') or '').split(',') if x] or sorted(LIB)
        nfiles = 0; shown = 0
        for sid in ids:
            if sid not in LIB: continue
            t = LIB[sid]; n = 0
            for m in rx.finditer(t):
                n += 1
                if n <= mx and shown < sp_.get('libmax', 8):
                    shown += 1
                    s = max(0, m.start() - C); e = min(len(t), m.end() + C)
                    hits.append('  [%s ~%d] ...%s<<%s>>%s...' % (sid, m.start(), t[s:m.start()], m.group(0)[:200], t[m.end():e]))
            if n: counts[sid] = n
            nfiles += 1
        counts['_library_files_searched'] = nfiles
    emit('### %s | %s | %s | %s' % (sp_['rows'], sc, sp_['pat'][:150], sp_.get('note', '')[:120]))
    emit('    HITS ' + json.dumps(counts))
    for h in hits: emit(h)
    emit()
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'rows': sp_['rows'].split(','), 'scope': sc, 'pattern': sp_['pat'], 'case_sensitive': bool(sp_.get('case')),
           'ids': sp_.get('ids') or None, 'hits': counts, 'note': sp_.get('note', ''), 'pass': 'second pass 2026-11-14'}
    with open(LOG, 'a', encoding='utf-8') as f: f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    nlog += 1
if out_path: open(out_path, 'w', encoding='utf-8').write('\n'.join(buf))
print('searches run and logged:', nlog)
