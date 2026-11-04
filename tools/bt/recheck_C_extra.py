"""Prints, for the re-check of scope C, the part of the +-1200 character window around each claim's quote that earlier views (smaller --w) did not show.
usage: python -I tools/bt/recheck_C_extra.py R193 ...   (assumed earlier window: 700 chars; R187/R189/R006 1200; Part 3 1300; R007 350)"""
import os, re, sys, json, bisect
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import or27_find as F
from or27_lib import ROOT, INDEX_PATH, utf8_stdout
utf8_stdout()
NEED = 1200
RECS = {r['id']: r for r in json.load(open(INDEX_PATH, encoding='utf-8'))['records']}
rows = [json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/history/positions/positions_C.jsonl'), encoding='utf-8')]
args = sys.argv[1:]
def used(rid):
    if rid.endswith(('R187', 'R189', 'R006')) or '-D' in rid: return 1200
    if rid.endswith('R007'): return 350
    return 700
for a in args:
    rid = a if a.startswith('OR27-') else ('OR27-3-' + a if a.startswith('D') else 'OR27-1-' + a)
    grp = [r for r in rows if (r['source'] or {}).get('report_id') == rid]
    if not grp: print('none', a); continue
    rec = RECS[rid]; P = F.get_part(rec['part'])
    lo = bisect.bisect_left(P.nmap, rec['start_offset']); hi = bisect.bisect_left(P.nmap, rec['end_offset'])
    W = used(rid)
    spans = []
    for c in grp:
        q = c['source'].get('quote')
        if not q: continue
        nq = re.sub(r'\s+', ' ', q.strip()); s = P.ntext.find(nq, lo, hi)
        if s < 0: continue
        e = s + len(nq)
        a0, b0 = max(lo, s - NEED), s - W   # extra before
        a1, b1 = e + W, min(hi, e + NEED)   # extra after
        if b0 > a0: spans.append((a0, b0))
        if b1 > a1: spans.append((a1, b1))
    spans.sort(); merged = []
    for s_, e_ in spans:
        if merged and s_ <= merged[-1][1]: merged[-1][1] = max(merged[-1][1], e_)
        else: merged.append([s_, e_])
    # drop parts already inside the main viewed windows of any claim
    print('=' * 60, rid, 'claims', len(grp), 'record len', hi - lo, 'extra spans', len(merged))
    seen = []
    for c in grp:
        q = c['source'].get('quote')
        if not q: continue
        nq = re.sub(r'\s+', ' ', q.strip()); s = P.ntext.find(nq, lo, hi)
        if s >= 0: seen.append((s - W, s + len(nq) + W))
    seen.sort(); sm = []
    for s_, e_ in seen:
        if sm and s_ <= sm[-1][1]: sm[-1][1] = max(sm[-1][1], e_)
        else: sm.append([s_, e_])
    for s_, e_ in merged:
        pieces = [(s_, e_)]
        for vs, ve in sm:
            new = []
            for ps, pe in pieces:
                if ve <= ps or vs >= pe: new.append((ps, pe)); continue
                if ps < vs: new.append((ps, vs))
                if pe > ve: new.append((ve, pe))
            pieces = new
        for ps, pe in pieces:
            if pe - ps > 3:
                print('--- [%d..%d]' % (ps - lo, pe - lo)); print(P.ntext[ps:pe])
