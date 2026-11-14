"""Library-wide search (108 texts) for accounts of the night/evening/camp of a given date, for row T1-040 (night of Jun 29 1863).
usage: python3 -I libsearch.py OUT.txt   -> hits: an occurrence of a date marker (June 29 / 29th / Monday) with a night/camp word within WIN chars,
printed with +-CTX characters of raw context (whitespace collapsed).  Heuristic work list, read by hand."""
import sys, re, os, json, time
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout'); sys.path.insert(0, ROOT + '/tools/bt')
import build as B
out = open(sys.argv[1], 'w', encoding='utf-8')
DATE = re.compile(sys.argv[2] if len(sys.argv) > 2 else r'(June\s+29|29th\s+of\s+June|June\s+29th|on\s+the\s+29th|the\s+29th\b|Monday,?\s+(the\s+)?29|\bMonday\b)', re.I)
NIGHT = re.compile(r'\b(night|evening|bivouac\w*|encamp\w*|camp-?\s?fires?|picket\w*|bonfires?|sentinel\w*|slept|supper|dusk|sunset)\b', re.I)
SKIP = re.compile(r'^(GBG-COMPILER|ADAMS-SENTINEL)-1863-(0[7-9]|1[0-2])')   # issues after the campaign are searched separately by topic
t0 = time.time(); tot = 0
for sid in sorted(B.LIB):
    if sid.startswith('OR-') or sid.startswith('ORSER'): continue
    try:
        raw, nt, nm, rel, sha = B.lib_text(sid)
    except Exception as e:
        out.write('## %s: unreadable %s\n' % (sid, e)); continue
    hits = []
    for m in DATE.finditer(nt):
        a = max(0, m.start() - 220); b = min(len(nt), m.end() + 220)
        w = nt[a:b]
        if NIGHT.search(w):
            hits.append((m.start(), w))
    # keep distinct windows (skip overlaps)
    kept = []; last = -10**9
    for pos, w in hits:
        if pos - last > 400: kept.append((pos, w)); last = pos
    out.write('## %s  date+night windows: %d (of %d date hits)\n' % (sid, len(kept), len(hits)))
    tot += len(kept)
    for pos, w in kept:
        out.write('  @%d: %s\n' % (nm[pos], re.sub(r'\s+', ' ', w)))
out.write('TOTAL kept %d in %.1fs\n' % (tot, time.time() - t0)); out.close()
print('done', tot, '%.1fs' % (time.time() - t0))
