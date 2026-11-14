"""Multi-query runner. Input file lines:  label ||| regex ||| only(comma, optional) ||| ctx ||| max
 prints compact hits. Lines starting with # ignored."""
import sys, re
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
import corpus, lib
CAP = int(__import__("os").environ.get("CAP","520"))
C = corpus.Corpus()
def tag(h):
    if 'cite' in h:
        return h['cite'].replace('OR Ser.I vol.27 ', 'OR27 ')
    if 'section' in h:
        return '%s %s "%s" p.%s%s' % (h['doc'], h['section'], (h.get('title') or '')[:30], h['page'], '~' if h.get('interp') else '')
    if h.get('pdf_page') is not None:
        return '%s pdf p.%s' % (h['doc'], h['pdf_page'])
    return h['doc']
for line in open(sys.argv[1]):
    line = line.rstrip('\n')
    if not line.strip() or line.startswith('#'):
        continue
    parts = [p.strip() for p in line.split('|||')]
    label, rx = parts[0], parts[1]
    only = [x for x in (parts[2] if len(parts) > 2 else '').split(',') if x] or None
    ctx = int(parts[3]) if len(parts) > 3 and parts[3] else 160
    mx = int(parts[4]) if len(parts) > 4 and parts[4] else 4
    if rx.startswith('~'):
        rx = r'\s*'.join(re.escape(ch) for ch in rx[1:] if not ch.isspace())
    print('######', label, '::', rx[:120], '::', only)
    hits = []
    if not only or any(o.startswith('OR27') for o in only):
        ps = (1, 2, 3)
        for o in (only or []):
            if o.startswith('OR27-pt'):
                ps = (int(o[-1]),)
        hits += corpus.grep_or(rx, ps, ctx, mx, re.I)
    if not only or any(o in lib.SF.SI.VOLUMES for o in only):
        vols = [o for o in (only or []) if o in lib.SF.SI.VOLUMES] or None
        hits += corpus.grep_sv(rx, vols, ctx, mx, re.I)
    ons = [o for o in (only or []) if not o.startswith('OR27') and o not in lib.SF.SI.VOLUMES] or None
    if not only or ons:
        hits += C.grep(rx, ons, ctx, mx, re.I)
    for h in hits:
        c = h['context']; a, b = h['at']
        m = c[a:b]
        if len(m) > 160: m = m[:80] + ' ... ' + m[-70:]
        print(('  [%s @%s] ...%s<<%s>>%s...' % (tag(h), h['raw_off'], c[:a], m, c[b:]))[:CAP])
    if not hits:
        print('  (no hits)')
