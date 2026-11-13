"""terrain-1 close-out helpers (read-only on every source text; run with python3 -I).
Search and resolve citations in: Official Records Ser. I vol. 27 (tools/bt/or27_find), the 99-text library (tmp/library/ws9 and /prior),
the National Park Service texts (tmp/library/web/nps) and the books fetched by the fence-1 close-out (tmp/fence-1/dl, read-only).
"""
import os, sys, re, json, glob, hashlib, bisect, unicodedata
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_find import get_part
from or27_lib import norm_query, build_nview

OR_IDX = json.load(open(os.path.join(ROOT, 'docs/battle-theatre/library/or27_index.json')))['records']
OR_BY_ID = {r['id']: r for r in OR_IDX}
OR_SHA = {1: '5c041e6ebc70cd4e33a325b411c7bec0b22ffa6dedbb71fbd4943fb57977a6ca', 2: '3d89c8396d3360cfe180d112d73f685603c95f68379d9dfb5a4f899133c86995', 3: '3c7212f2954d83606e38fb00337fcaf78f85193b56b79a341d1f28659f4d93c1'}
OR_PATH = {1: 'tmp/library/or27/cu31924077699761_djvu.txt', 2: 'tmp/library/or27/cu31924077728255_djvu.txt', 3: 'tmp/library/or27/cu31924077700262_djvu.txt'}
WS9 = os.path.join(ROOT, 'tmp/library/ws9'); WS9P = os.path.join(WS9, 'prior')
NPSD = os.path.join(ROOT, 'tmp/library/web/nps')
F1DL = os.path.join(ROOT, 'tmp/fence-1/dl')
TDL = os.path.join(ROOT, 'tmp/terrain-1/dl')

_libpath = {}
def lib_ids():
    if not _libpath:
        for d in (WS9, WS9P):
            for f in glob.glob(d + '/*__*_djvu.txt'):
                _libpath[os.path.basename(f).split('__')[0]] = f
        for d, ids in ((F1DL, {'DAWES-1890': 'servsixthwiscon00dawerich/servsixthwiscon00dawerich_djvu.txt', 'MORHOUS-1879': 'reminiscencesof00morh/reminiscencesof00morh_djvu.txt', 'EDDY-1864': 'historyofsixtiet00eddy/historyofsixtiet00eddy_djvu.txt'}),):
            for k, v in ids.items():
                p = os.path.join(d, v)
                if os.path.exists(p): _libpath[k] = p
        if os.path.isdir(TDL):
            for f in glob.glob(TDL + '/*/*_djvu.txt'):
                _libpath['T-' + os.path.basename(os.path.dirname(f))] = f
    return _libpath

_lt = {}
def lib_text(sid):
    if sid not in _lt:
        p = lib_ids()[sid]
        raw = open(p, encoding='utf-8', newline='').read()
        nt, nm = build_nview(raw)
        _lt[sid] = (p, raw, nt, nm)
    return _lt[sid]

_nt = {}
def nps_text(sid):
    if sid not in _nt:
        p = os.path.join(NPSD, sid, sid + '.txt')
        raw = open(p, encoding='utf-8', newline='').read()
        nt, nm = build_nview(raw)
        _nt[sid] = (p, raw, nt, nm)
    return _nt[sid]

def nps_ids():
    return sorted(d for d in os.listdir(NPSD) if os.path.exists(os.path.join(NPSD, d, d + '.txt')))

def or_search(pat, parts=(1, 2), ctx=200, flags=re.I, maxn=40):
    P_out = []
    rx = re.compile(pat, flags)
    for p in parts:
        P = get_part(p)
        n = 0
        for m in rx.finditer(P.ntext):
            a, b = P.orig_span(m.start(), m.end())
            c = P.cite(a, b)
            c['ctx'] = P.ntext[max(0, m.start() - ctx): m.end() + ctx]
            c['match'] = m.group(0)
            P_out.append(c); n += 1
            if n >= maxn: break
    return P_out

def page_hint(raw, off):
    lo = max(0, off - 7000); w = raw[lo:off]
    best = None
    for m in re.finditer(r'(?m)^[ \t]*(\d{1,4})[ \t]*$', w): best = m.group(1)
    for m in re.finditer(r'(?i)(?:gettysburg|at gettysburg)\.?\s+(\d{1,4})\b|\b(\d{1,4})\s+(?:new york|pennsylvania|maine|michigan|southern historical)\b', w):
        best = m.group(1) or m.group(2)
    return best

def lib_search(sid, pat, ctx=250, flags=re.I, maxn=30):
    p, raw, nt, nm = lib_text(sid)
    out = []
    for m in re.finditer(pat, nt, flags):
        a, b = nm[m.start()], nm[m.end() - 1] + 1
        out.append(dict(sid=sid, off=[a, b], hint=page_hint(raw, a), ctx=nt[max(0, m.start() - ctx): m.end() + ctx], match=m.group(0)))
        if len(out) >= maxn: break
    return out

def nps_search(sid, pat, ctx=250, flags=re.I, maxn=30):
    p, raw, nt, nm = nps_text(sid)
    out = []
    for m in re.finditer(pat, nt, flags):
        a, b = nm[m.start()], nm[m.end() - 1] + 1
        pg = None
        for mm in re.finditer(r'=== PAGE (\d+) ===', raw[:a]): pg = mm.group(1)
        out.append(dict(sid=sid, off=[a, b], pdf_page=pg, ctx=nt[max(0, m.start() - ctx): m.end() + ctx], match=m.group(0)))
        if len(out) >= maxn: break
    return out

def all_lib_search(pat, ctx=200, flags=re.I, maxn_each=5, skip=('ADAMS-SENTINEL', 'GBG-COMPILER')):
    res = []
    for sid in sorted(lib_ids()):
        if sid.startswith(skip): continue
        try:
            for h in lib_search(sid, pat, ctx, flags, maxn_each): res.append(h)
        except Exception as e:
            res.append(dict(sid=sid, error=str(e)))
    return res

def all_nps_search(pat, ctx=200, flags=re.I, maxn_each=5):
    res = []
    for sid in nps_ids():
        try:
            for h in nps_search(sid, pat, ctx, flags, maxn_each): res.append(h)
        except Exception as e:
            res.append(dict(sid=sid, error=str(e)))
    return res
