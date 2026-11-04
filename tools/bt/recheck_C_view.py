"""Viewer for the full-passage fidelity re-check of scope C.
usage: python -I tools/bt/recheck_C_view.py <report_id|claim_id ...> [--w 1200]
For each report id (e.g. R187 or OR27-1-R187) prints the claims of that report and the merged raw-text windows (+-w chars of the normalised
text, running heads removed, hyphenation joined) around each claim's quote, with [[Cnnnn> ... <]] markers around the quotes."""
import os, re, sys, json, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import or27_find as F
from or27_lib import ROOT, INDEX_PATH, utf8_stdout
utf8_stdout()
W = 1200
args = sys.argv[1:]
if '--w' in args:
    i = args.index('--w'); W = int(args[i + 1]); del args[i:i + 2]
RECS = {r['id']: r for r in json.load(open(INDEX_PATH, encoding='utf-8'))['records']}
rows = [json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/history/positions/positions_C.jsonl'), encoding='utf-8')]
by = {}
for r in rows:
    rid = (r['source'] or {}).get('report_id')
    by.setdefault(rid, []).append(r)
for a in args:
    if re.match(r'POS-C-\d+', a) or re.match(r'^\d+$', a):
        cid = a if a.startswith('POS') else 'POS-C-%04d' % int(a)
        c = next(r for r in rows if r['claim_id'] == cid)
        grp = [c]; rid = c['source']['report_id']
    else:
        rid = a if a.startswith('OR27-') else ('OR27-3-' + a if a.startswith('D') else 'OR27-1-' + a)
        grp = by.get(rid, [])
    if not grp:
        print('no claims for', a); continue
    rec = RECS[rid]
    P = F.get_part(rec['part'])
    lo = bisect.bisect_left(P.nmap, rec['start_offset']); hi = bisect.bisect_left(P.nmap, rec['end_offset'])
    print('=' * 100); print(rid, rec.get('rank'), rec.get('author'), 'ocr', rec['ocr']['grade'], 'len', hi - lo, 'nview chars')
    spans = []
    for c in grp:
        q = c['source'].get('quote')
        s = hi_ = None
        if q:
            nq = re.sub(r'\s+', ' ', q.strip()); s = P.ntext.find(nq, lo, hi)
            if s >= 0: hi_ = s + len(nq)
            else: s = None
        c['_s'], c['_e'] = s, hi_
        print('-- %s [%s] %s | when=%r t=%s | place=%r road=%r\n   ACT: %s\n   Q: %r\n   NOTE: %s | tier=%s ocr=%s conf=%s' % (
            c['claim_id'], c['kind'], c['unit_id'], c['when']['printed'], c['when']['t_iso'], c['place']['printed'], c['place']['direction_or_road'],
            c['activity'], q, c['note'], c['tier'], c['ocr_uncertain'], c['conflicts_with']))
    iv = sorted(((max(lo, c['_s'] - W), min(hi, c['_e'] + W), c) for c in grp if c['_s'] is not None), key=lambda t: t[:2])
    merged = []
    for a_, b_, c in iv:
        if merged and a_ <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], b_); merged[-1][2].append(c)
        else:
            merged.append([a_, b_, [c]])
    for a_, b_, cs in merged:
        out = []; pos = a_
        for c in sorted(cs, key=lambda c: c['_s']):
            if c['_s'] < pos: 
                out.append('{%s}' % c['claim_id'][-4:]); continue
            out.append(P.ntext[pos:c['_s']]); out.append('[[%s> ' % c['claim_id'][-4:]); out.append(P.ntext[c['_s']:c['_e']]); out.append(' <]]'); pos = c['_e']
        out.append(P.ntext[pos:b_])
        print('\n--- window %d..%d (claims %s)\n%s' % (a_ - lo, b_ - lo, ','.join(c['claim_id'][-4:] for c in cs), ''.join(out)))
