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
NPSX = os.path.join(ROOT, 'tmp/terrain-1/nps')
def nps_text(sid):
    if sid not in _nt:
        variant = ''
        base = sid
        if '~' in sid:
            base, variant = sid.split('~', 1); variant = '.' + variant
        p = os.path.join(NPSD, base, base + variant + '.txt')
        if not os.path.exists(p):
            p = os.path.join(NPSX, base + '.txt')
        raw = open(p, encoding='utf-8', newline='').read()
        nt, nm = build_nview(raw)
        _nt[sid] = (p, raw, nt, nm)
    return _nt[sid]

def nps_ids():
    ids = [d for d in os.listdir(NPSD) if os.path.exists(os.path.join(NPSD, d, d + '.txt'))]
    if os.path.isdir(NPSX):
        ids += [f[:-4] for f in os.listdir(NPSX) if f.endswith('.txt')]
    return sorted(ids)

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


# ---------------------------------------------------------------- page refinement and second witness
_head_rx = [re.compile(r'CAMPAI?[A-Za-z]{0,4}\W{0,3}\s+(\d{3,4})\b'),
            re.compile(r'\n\s*(\d{3,4})\s*\n+\s*N\.?\s*C\b'),
            re.compile(r'\b(\d{3,4})\s+N\.?\s*C\.?,?\s*[TV]A', re.I)]

def _head_events(P, start, end, lo, hi):
    ev = []
    seg = P.text[start:end]
    for rx in _head_rx:
        for m in rx.finditer(seg):
            n = int(m.group(1))
            if lo <= n <= hi + 1:
                ev.append((start + m.start(), n))
    ev.sort()
    return ev

def page_info(part, a, b):
    """printed page of the character span [a,b) in the raw OR text. Returns dict(page, basis, lo, hi).
    basis: 'running head' | 'garbled running head read in the text' | 'interpolated'."""
    import bisect
    P = get_part(part)
    pa = P.pm.page_at(a); pb = P.pm.page_at(max(a, b - 1))
    def one(p, off):
        if p['conf'].startswith(('head', 'front')):
            return dict(page=str(p['page']), basis='running head', lo=p['page'], hi=p['page'])
        lo, hi = p['lo'], p['hi']
        if hi == lo:
            return dict(page=str(lo), basis='running head', lo=lo, hi=hi)
        i = bisect.bisect_right(P.pm.offs, off) - 1
        start = P.pm.offs[i] if i >= 0 else 0
        ev = _head_events(P, start, off, lo, hi)
        if ev:
            n = ev[-1][1]
            if lo <= n <= hi:
                return dict(page=str(n), basis='garbled running head read in the text', lo=lo, hi=hi)
        # the previous recognized head is page lo; no garbled head between it and the passage: page lo
        if i >= 0 and P.pm.pages[i] == lo:
            end = P.pm.offs[i + 1] if i + 1 < len(P.pm.offs) else len(P.text)
            later = [e for e in _head_events(P, off, end, lo, hi) if e[1] > lo]
            if later:
                return dict(page=str(lo), basis='no running head between the page-%d head and the passage; the next garbled head (%d) follows it' % (lo, later[0][1]), lo=lo, hi=hi)
        return dict(page='~%d (%d-%d)' % (p['page'], lo, hi), basis='interpolated', lo=lo, hi=hi)
    ra = one(pa, a); rb = one(pb, max(a, b - 1))
    if ra['page'] == rb['page']:
        return ra
    return dict(page='%s-%s' % (ra['page'], rb['page']), basis=ra['basis'] if ra['basis'] == rb['basis'] else ra['basis'] + ' / ' + rb['basis'], lo=ra['lo'], hi=rb['hi'])

import unicodedata
W2 = os.path.join(ROOT, 'tmp/terrain-1/dl/or27_w2')
WITNESS = {
  1: [('warofrebellion271unit', 'archive.org item warofrebellion271unit (Univ. of Illinois copy)', '4a388b6291bb972d2c8c0086d3d29973b288e0008408f6ef869a75ac6f25ff63'),
      ('warofrebellion012701rootrich', 'archive.org item warofrebellion012701rootrich', '4ff47cecfd3a71f911c3e0b924f23e60709c2161c509a0a22d173127d6f1183d')],
  2: [('warofrebellion272unit', 'archive.org item warofrebellion272unit (Univ. of Illinois copy)', '144f88d2399c99feecccba69b42128f9ae1c3b5ab1eef965904f2e1ba04a1e02'),
      ('warofrebellionco272unit', 'archive.org item warofrebellionco272unit (BYU copy)', 'b31739105c5e886a372998737e01e513cb9877c8c2713dac85be24fa281a6c12')],
}
_wc = {}
def squash(s):
    out = []
    for ch in s:
        for d in unicodedata.normalize('NFKD', ch):
            if d.isalnum(): out.append(d.lower())
    return ''.join(out)
def _wload(ident):
    if ident not in _wc:
        raw = open(os.path.join(W2, ident + '_djvu.txt'), encoding='utf-8', errors='replace').read()
        raw = re.sub(r'-\s*\n\s*(?=[a-z])', '', raw)
        _wc[ident] = squash(raw)
    return _wc[ident]
def witness_check(part, quote):
    res = []
    q = squash(quote)
    for ident, label, sha in WITNESS.get(part, []):
        t = _wload(ident)
        i = t.find(q)
        res.append(dict(scan=label, sha256=sha, found=i >= 0, occurrences=t.count(q) if i >= 0 else 0))
    return res


# ---------------------------------------------------------------- second scans of library books (added 2026-11-14)
LIB_WITNESS = {
  'BL-3': [('archive.org item battlesleadersci03underich (a second scan of Battles and Leaders vol. III, fetched 2026-11-14 via https://archive.org/cors/)',
            'tmp/terrain-1/dl/bl3/bl3_underich_djvu.txt')],
}
_lwc = {}
def lib_witness(sid, quote):
    """does a second scan of the same book carry the quote (alphanumerics only, case and hyphenation ignored)? returns [] when no second scan is on file."""
    res = []
    q = squash(quote)
    for label, rel in LIB_WITNESS.get(sid, []):
        if rel not in _lwc:
            raw = open(os.path.join(ROOT, rel), encoding='utf-8', errors='replace').read()
            raw = re.sub(r'-\s*\n\s*(?=[a-z])', '', raw)
            _lwc[rel] = (squash(raw), hashlib.sha256(open(os.path.join(ROOT, rel), 'rb').read()).hexdigest())
        t, sh = _lwc[rel]
        i = t.find(q)
        res.append(dict(scan=label, sha256=sh, found=i >= 0, occurrences=t.count(q) if i >= 0 else 0))
    return res
