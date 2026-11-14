"""Build GOVERNANCE/evidence_corrections/fence-1.jsonl from the row specs (spec_*.py) and re-verify every citation.
Run: python3 -I build_corrections.py   (read-only on all source texts; writes only the jsonl, a build log and the page-hint cache)
Every citation quote must be found verbatim (whitespace-normalised, case-sensitive, line-break hyphenation joined) exactly once
in the named report (OR) or source text; otherwise the build stops with the failing row and quote."""
import os, sys, re, json, glob, hashlib, importlib.util, time, pickle
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt')); sys.path.insert(0, HERE)
from or27_find import get_part
from or27_lib import norm_query, build_nview
import spec_lib, witness

OUT = os.environ.get('FENCE1_OUT') or os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-1.jsonl')  # FENCE1_OUT: dry-run target
OR_IDX = json.load(open(os.path.join(ROOT, 'docs/battle-theatre/library/or27_index.json')))['records']
OR_BY_ID = {r['id']: r for r in OR_IDX}
WS9 = os.path.join(ROOT, 'tmp/library/ws9'); WS9P = os.path.join(WS9, 'prior')
NPSD = os.path.join(ROOT, 'tmp/library/web/nps')
EXTRA = os.path.join(ROOT, 'tmp/fence-1/dl')
OR_SHA = {1: '5c041e6ebc70cd4e33a325b411c7bec0b22ffa6dedbb71fbd4943fb57977a6ca', 2: '3d89c8396d3360cfe180d112d73f685603c95f68379d9dfb5a4f899133c86995', 3: '3c7212f2954d83606e38fb00337fcaf78f85193b56b79a341d1f28659f4d93c1'}
OR_PATH = {1: 'tmp/library/or27/cu31924077699761_djvu.txt', 2: 'tmp/library/or27/cu31924077728255_djvu.txt', 3: 'tmp/library/or27/cu31924077700262_djvu.txt'}
EXTRA_IDS = {'DAWES-1890': 'servsixthwiscon00dawerich/servsixthwiscon00dawerich_djvu.txt', 'MORHOUS-1879': 'reminiscencesof00morh/reminiscencesof00morh_djvu.txt', 'EDDY-1864': 'historyofsixtiet00eddy/historyofsixtiet00eddy_djvu.txt'}
CLASS = {'OR': 'primary (official report written 1863-65; Government Printing Office volume 1889, raw OCR, single witness)'}

# --- sources added by the 2026-11-13 re-audit (all read-only; every file is hashed into its citation) ---
ACQ_LEDGER = {it['id']: it for it in json.load(open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/tl-02/sources_tl02.json')))['items']}
KIT_LIB = os.path.join(ROOT, 'tmp/kit-us-1c/lib')
KIT_SHA = {  # from GOVERNANCE/horde/requests/bt-oob-kit-us-1c-library.md (declared by the oob-kit workstream)
  'servsixthwiscon00dawerich': 'b168059e595763a9d53e209a09d286f84ce60cb55a67654e28cabd18e9c367a7',
  '24thmichiganiron00curtrich': '722f4b6fe42095cc8e85aba788402fbd63e41129794cd522af43fffa7be9f1f9',
  'websterregiment00cookrich': '217db358359e24249c7b0803b28244ed35e3e84b22aa74e894486ae7696e0340',
  'threeyearsinarmy00davis': 'bfbdb08986b3c8e28ef6e9d9b443d5e1e94d9290f8cb4b381d774dd5877e3330',
  'sixteenthmainere00smal': '3845f130acd381b7779f4dbc3bbbe602616bdc09f950756d4570bc88d01f882f',
  'infantryhist00smitrich': '5c74756553774d95bc12105d09ccd4fe110068f4a5ad467c326a0c5a80ee85f1',
  'vermontincivilwa02bene': '53437ad1219dcbb2cfa33bf9d40e03d818f0238d10182e41911764b35feb6827'}
KIT_TITLE = {
  'servsixthwiscon00dawerich': 'Service with the Sixth Wisconsin Volunteers (R. R. Dawes, 1890)',
  '24thmichiganiron00curtrich': 'History of the Twenty-fourth Michigan of the Iron Brigade (O. B. Curtis, 1891)',
  'websterregiment00cookrich': 'History of the Twelfth Massachusetts Volunteers, the Webster Regiment (B. F. Cook, 1882)',
  'threeyearsinarmy00davis': 'Three Years in the Army: the Thirteenth Massachusetts Volunteers (C. E. Davis, 1894)',
  'sixteenthmainere00smal': 'The Sixteenth Maine Regiment in the War of the Rebellion (A. R. Small, 1886)',
  'infantryhist00smitrich': 'History of the Seventy-sixth Regiment New York Volunteers (A. P. Smith, 1867)',
  'vermontincivilwa02bene': 'Vermont in the Civil War, volume 2 (G. G. Benedict, 1886)'}
PM_DIR = os.path.join(ROOT, 'tmp/library/web/photomatch/www.nps.gov')
PM_MAN = {}
for _l in open(os.path.join(ROOT, 'tmp/library/web/photomatch/manifest.jsonl'), encoding='utf-8'):
    if _l.strip():
        _r = json.loads(_l)
        if _r.get('text_file'): PM_MAN[os.path.basename(_r['text_file'])] = _r
CA_DIR = os.path.join(ROOT, 'tmp/library/web/ca/pages')
W2_DIR = os.path.join(ROOT, 'tmp/fence-1/dl/or27_w2')
W2_SHA = {w[0]: w[2] for part in witness.WITNESS.values() for w in part}
IMG_CHECKS = json.load(open(os.path.join(HERE, '..', 'image_checks.json')))['checks']

_sha = {}
def file_sha(path):
    if path not in _sha:
        h = hashlib.sha256()
        with open(path, 'rb') as f:
            for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
        _sha[path] = h.hexdigest()
    return _sha[path]

_fv = {}
def file_view(path):
    if path not in _fv:
        raw = open(path, encoding='utf-8', newline='').read()
        nt, nm = build_nview(raw)
        _fv[path] = (raw, nt, nm)
    return _fv[path]

def find_in_file(path, qn, occ, label, q):
    """exactly one verbatim (whitespace-normalised, case-sensitive) hit of the quote in the file; returns (a, b, raw)"""
    raw, nt, nm = file_view(path)
    idxs = []; pos = 0
    while True:
        i = nt.find(qn, pos)
        if i < 0: break
        idxs.append(i); pos = i + 1
    if not idxs: raise SystemExit('NOT FOUND in %s: %r' % (label, q))
    if len(idxs) > 1 and occ is None: raise SystemExit('AMBIGUOUS (%d) in %s: %r (give occ)' % (len(idxs), label, q))
    i = idxs[occ or 0]
    return nm[i], nm[i + len(qn) - 1] + 1, raw

def resolve_new(c):
    """sources added by the re-audit: ACQ, KIT, NPSW, CA, OR1W"""
    src, ref, q, occ = c['src'], c['ref'], c['quote'], c.get('occ')
    qn = norm_query(q)
    base = dict(quote=q, role=c['role'], note=c.get('note'), match='exact (whitespace-normalised, case-sensitive)')
    if c.get('reading'): base['reading'] = c['reading']
    if src == 'ACQ':
        it = ACQ_LEDGER[ref]; p0 = os.path.join(ROOT, it['local_path'])
        p, _s = lib_copy(p0, 'ACQ-' + ref + '_djvu.txt')
        if file_sha(p) != it['sha256']: raise SystemExit('SHA MISMATCH vs tl-02 ledger: ' + ref)
        it = dict(it, local_path=os.path.relpath(p, ROOT))
        a, b, raw = find_in_file(p, qn, occ, ref, q)
        return dict(base, source_id=ref, source_class='secondary (published book, public domain, %s; raw OCR, single witness)' % it['date'], part=None, report_id=None,
                    **page_fields(raw, a, b, c.get('pp')), offset=[a, b], local_path=it['local_path'], local_sha256=it['sha256'],
                    provenance=dict(archive_item=it['url'], title=it['title'], ledger='docs/battle-theatre/GOVERNANCE/horde/tl-02/sources_tl02.json'))
    if src == 'KIT':
        p, sha = lib_copy(os.path.join(KIT_LIB, ref, ref + '_djvu.txt'), 'KIT-' + ref + '_djvu.txt')
        if sha != KIT_SHA[ref]: raise SystemExit('SHA MISMATCH vs oob-kit note: ' + ref)
        a, b, raw = find_in_file(p, qn, occ, ref, q)
        return dict(base, source_id='KIT:' + ref, source_class='secondary (published regimental history, public domain; raw OCR, single witness)', part=None, report_id=None,
                    **page_fields(raw, a, b, c.get('pp')), offset=[a, b], local_path=os.path.relpath(p, ROOT), local_sha256=sha,
                    provenance=dict(archive_item='https://archive.org/details/' + ref, title=KIT_TITLE[ref], ledger='docs/battle-theatre/GOVERNANCE/horde/requests/bt-oob-kit-us-1c-library.md'))
    if src == 'K2':
        p, sha = lib_copy(os.path.join(K2_SRC, ref + '.txt'), 'K2-' + ref + '.txt')
        a, b, raw = find_in_file(p, qn, occ, ref, q)
        ident, title = K2_PROV[ref]
        return dict(base, source_id='K2:' + ref, source_class='secondary (published regimental or brigade history, public domain; raw OCR, single witness)', part=None, report_id=None,
                    **page_fields(raw, a, b, c.get('pp')), offset=[a, b], local_path=os.path.relpath(p, ROOT), local_sha256=sha,
                    provenance=dict(archive_item='https://archive.org/details/' + ident, title=title, ledger='tmp/kit-us-2c-2d3d/p0_sources.py (bt-oob-kit workstream, declared 2026-11-13; scratch, not committed)'))
    if src == 'NPSW':
        p = os.path.join(PM_DIR, ref + '.htm.txt'); m = PM_MAN[os.path.basename(p)]
        if file_sha(p) != m['text_sha256']: raise SystemExit('SHA MISMATCH vs photomatch manifest: ' + ref)
        a, b, raw = find_in_file(p, qn, occ, ref, q)
        return dict(base, source_id='NPSW:' + ref, source_class='secondary (National Park Service web page, United States government work; text of the saved HTML)', part=None, report_id=None,
                    printed_page=None, offset=[a, b], local_path=os.path.relpath(p, ROOT), local_sha256=m['text_sha256'],
                    provenance=dict(url=m['url_final'], retrieved_utc=m['retrieved_utc'], html_file=m['file'], html_sha256=m['sha256'], ledger='tmp/library/web/photomatch/manifest.jsonl (photo-match workstream)'))
    if src == 'CA':
        p = os.path.join(CA_DIR, ref + '.txt')
        lccn, date, ed, seq = ref.split('/')
        a, b, raw = find_in_file(p, qn, occ, ref, q)
        return dict(base, source_id='CA:' + ref, source_class='primary (1863 newspaper, Library of Congress Chronicling America; OCR text of the page, garbled)', part=None, report_id=None,
                    printed_page=None, offset=[a, b], local_path=os.path.relpath(p, ROOT), local_sha256=file_sha(p),
                    provenance=dict(lccn=lccn, issue_date=date, edition=ed, image_sequence=seq, url='https://chroniclingamerica.loc.gov/lccn/%s/%s/%s/%s/' % (lccn, date, ed, seq)))
    if src == 'OR1W':
        w = c['witness']; p = os.path.join(W2_DIR, w + '_djvu.txt')
        if file_sha(p) != W2_SHA[w]: raise SystemExit('SHA MISMATCH witness scan: ' + w)
        a, b, raw = find_in_file(p, qn, occ, w, q)
        rid = ref if ref.startswith('OR27') else 'OR27-1-' + ref; rec = OR_BY_ID[rid]
        return dict(base, source_id='OR-27-1-W:' + w, source_class='primary (official report written 1863-65; Government Printing Office volume 1889, second scan of the same volume, raw OCR)', part=1, report_id=rid,
                    report_author=(rec.get('rank') or '') + ' ' + (rec.get('author') or ''), printed_page=c['page'], offset=[a, b], local_path=os.path.relpath(p, ROOT), local_sha256=W2_SHA[w],
                    provenance=dict(archive_item='https://archive.org/details/' + w, note='printed page given by the engineer from the page image (leaf = printed page + 18 in this scan); offsets are in the OCR text of this scan, not in the Cornell text'))
    raise SystemExit('bad src ' + src)


# --- wave 4 (2026-11-14): books of the bt-oob-kit II Corps pass (declared in tmp/kit-us-2c-2d3d/p0_sources.py with archive.org identifiers);
# every foreign scratch file that is cited is copied into tmp/fence-1/lib (sha256 checked) so that the citations keep verifying when the other scratch is cleaned.
K2_SRC = os.path.join(ROOT, 'tmp/kit-us-2c-2d3d/lib')
K2_PROV = {
  'ny126_willson': ('disasterstruggle00will', 'Willson, Disaster, Struggle, Triumph: the Adventures of 1000 "Boys in Blue" (126th New York, 1870)'),
  'pa69_mcdermott': ('briefhistoryof00mcde', 'McDermott, A Brief History of the 69th Regiment Pennsylvania Veteran Volunteers (1889)'),
  'pa_banes': ('historyofphilade01bane', 'Banes, History of the Philadelphia Brigade: Sixty-ninth, Seventy-first, Seventy-second, and One Hundred and Sixth Pennsylvania Volunteers (1876)'),
}
LIBDIR = os.path.join(ROOT, 'tmp/fence-1/lib')
def lib_copy(src_path, name):
    """copy a foreign scratch text into tmp/fence-1/lib/<name> (once) and return (path, sha256); the copy must be byte-identical"""
    os.makedirs(LIBDIR, exist_ok=True)
    dst = os.path.join(LIBDIR, name)
    if not os.path.exists(dst):
        import shutil; shutil.copyfile(src_path, dst)
    elif os.path.exists(src_path) and file_sha(dst) != file_sha(src_path):
        raise SystemExit('COPY DIFFERS from source: ' + name)
    return dst, file_sha(dst)

def attach_image(rec, c):
    iid = c.get('image')
    if not iid: return rec
    chk = IMG_CHECKS[iid]
    for k in ('crop_file', 'second_crop_file'):
        if chk.get(k):
            sha = file_sha(os.path.join(ROOT, chk[k]))
            if sha != chk[k.replace('file', 'sha256')]: raise SystemExit('IMAGE SHA MISMATCH ' + chk[k])
    rec['image_check'] = dict(id=iid, **{k: v for k, v in chk.items()})
    return rec

_libpath = {}
def lib_path(sid):
    if sid in EXTRA_IDS: return os.path.join(EXTRA, EXTRA_IDS[sid])
    if not _libpath:
        for d in (WS9, WS9P):
            for f in glob.glob(d + '/*__*_djvu.txt'):
                _libpath[os.path.basename(f).split('__')[0]] = f
    return _libpath[sid]

_lt = {}
def lib_text(sid):
    if sid not in _lt:
        p = lib_path(sid)
        raw = open(p, encoding='utf-8', newline='').read()
        nt, nm = build_nview(raw)
        _lt[sid] = (p, raw, nt, nm)
    return _lt[sid]

_nt = {}
NPS_MAN = json.load(open(os.path.join(NPSD, 'MANIFEST.json')))['items']
NPS_PAGES = {'NPSGOV-CIVILIANS': dict(url='https://www.nps.gov/articles/000/civilians-at-gettysburg.htm', retrieved='2026-11-13', text_sha256='c39f60baf34ac3165a9d3cb95ec12f6d849e420e2b356bfcf8daecc310083129')}
def nps_text(sid):
    if sid not in _nt:
        p = os.path.join(NPSD, sid, sid + '.txt')
        if not os.path.exists(p): p = os.path.join(NPSD, 'pages', sid, sid + '.txt')
        raw = open(p, encoding='utf-8', newline='').read()
        nt, nm = build_nview(raw)
        _nt[sid] = (p, raw, nt, nm)
    return _nt[sid]

_RH = re.compile(r"(?m)^[ \t]*(?:(?:\d{1,2}[ \t]+)?(\d{1,4})[ \t]+([A-Z][A-Z .,'&;:-]{5,})|([A-Z][A-Z .,'&;:-]{5,})[ \t]+(\d{1,4})|(\d{1,4})[ \t]+([A-Z][A-Za-z .,'&;:-]{5,60})|([A-Z][A-Za-z .,'&;:-]{5,60})[ \t]+(\d{1,4}))[ \t]*$")
def _heads(raw, lo, hi):
    out = []
    for m in _RH.finditer(raw, max(0, lo), min(len(raw), hi)):
        n = m.group(1) or m.group(4) or m.group(5) or m.group(8)
        out.append((m.start(), int(n)))
    return out

def book_page(raw, a, b):
    """printed page of a book quote from the running heads of the OCR text (wave 4, 2026-11-14): the last head before the quote and the first head after it.
    Consecutive numbers (n, n+1) fix the page as n (printed_page); a gap of two gives 'n or n+1'; anything else gives no page (locate by offset).
    Returns (printed_page or None, page_hint or None). Replaces the heuristic of 2026-11-13 (nearest preceding page-number-like token), which disagreed with the running heads in 12 of 20 cases where both gave a page."""
    prv = [h for h in _heads(raw, a - 6000, a) if h[0] < a]
    nxt = [h for h in _heads(raw, b, b + 6000)]
    if prv and nxt:
        p, n = prv[-1][1], nxt[0][1]
        if n == p + 1: return str(p), None
        if n == p + 2: return None, '%d or %d (a running head between them is not in the OCR)' % (p, p + 1)
    return None, None     # an unconfirmed single head is not reported: inline or garbled heads gave wrong pages in tests (e.g. a stray '266' before a page-256 quote)

def page_hint(raw, off):
    """OLD heuristic of 2026-11-13 (kept only for the citations that the wave-4 finder cannot place): nearest preceding running-head-like number; a hint, not a citation page"""
    lo = max(0, off - 7000); w = raw[lo:off]
    best = None
    for m in re.finditer(r'(?m)^[ \t]*(\d{1,4})[ \t]*$', w): best = m.group(1)
    for m in re.finditer(r'(?i)(?:gettysburg|at gettysburg)\.?\s+(\d{1,4})\b|\b(\d{1,4})\s+(?:new york|pennsylvania|maine|michigan|southern historical)\b', w):
        best = m.group(1) or m.group(2)
    return best

def page_fields(raw, a, b, pp):
    """printed_page / page_hint / page_check for a book citation; a given pp is checked against the running heads (a disagreement stops the build)"""
    pg, hint = book_page(raw, a, b)
    if pp:
        if pg and str(pp) != pg: raise SystemExit('PAGE MISMATCH: given %s, running heads say %s at offset %d' % (pp, pg, a))
        return dict(printed_page=str(pp), page_hint=None, page_basis='given by the engineer' + (' and confirmed by the running heads' if pg else ''))
    if pg: return dict(printed_page=pg, page_hint=None, page_basis='running heads before and after the quote (consecutive numbers)')
    if hint: return dict(printed_page=None, page_hint=hint, page_basis='running heads (unconfirmed)')
    return dict(printed_page=None, page_hint=None, page_basis='no running head found near the quote (locate by offset)')

def nps_page(raw, off):
    last = None
    for m in re.finditer(r'=== PAGE (\d+) ===', raw[:off]): last = m.group(1)
    return last

def resolve_old(c):
    src, ref, q, occ = c['src'], c['ref'], c['quote'], c.get('occ')
    qn = norm_query(q)
    if src.startswith('OR') and src != 'OR1W':
        part = int(src[2]); rid = 'OR27-%d-%s' % (part, ref) if not ref.startswith('OR27') else ref
        P = get_part(part); rec = OR_BY_ID[rid]
        hits = []; pos = 0
        while True:
            i = P.ntext.find(qn, pos)
            if i < 0: break
            a, b = P.orig_span(i, i + len(qn)); ci = P.cite(a, b)
            if rec['start_offset'] <= a < rec['end_offset']: hits.append((i, a, b, ci))
            pos = i + 1
        if not hits: raise SystemExit('NOT FOUND in %s: %r' % (rid, q))
        if len(hits) > 1 and occ is None: raise SystemExit('AMBIGUOUS (%d) in %s: %r (give occ)' % (len(hits), rid, q))
        i, a, b, ci = hits[occ or 0]
        return dict(source_id='OR-27-%d' % part, source_class=CLASS['OR'], part=part, report_id=rid, report_author=(rec.get('rank') or '') + ' ' + (rec.get('author') or ''),
                    printed_page=ci['page'], quote=q, offset=[a, b], local_path=OR_PATH[part], local_sha256=OR_SHA[part], match='exact (whitespace-normalised, case-sensitive)',
                    second_witness=witness.check(part, q), role=c['role'], note=c.get('note'))
    if src == 'LIB':
        p, raw, nt, nm = lib_text(ref)
        idxs = []; pos = 0
        while True:
            i = nt.find(qn, pos)
            if i < 0: break
            idxs.append(i); pos = i + 1
        if not idxs: raise SystemExit('NOT FOUND in %s: %r' % (ref, q))
        if len(idxs) > 1 and occ is None: raise SystemExit('AMBIGUOUS (%d) in %s: %r' % (len(idxs), ref, q))
        i = idxs[occ or 0]; a, b = nm[i], nm[i + len(qn) - 1] + 1
        cls = 'secondary (published 19th/early-20th-century book; raw OCR, single witness)'
        return dict(source_id=ref, source_class=cls, part=None, report_id=None, **page_fields(raw, a, b, c.get('pp')), quote=q, offset=[a, b],
                    local_path=os.path.relpath(p, ROOT), match='exact (whitespace-normalised, case-sensitive)', role=c['role'], note=c.get('note'))
    if src == 'NPS':
        p, raw, nt, nm = nps_text(ref)
        idxs = []; pos = 0
        while True:
            i = nt.find(qn, pos)
            if i < 0: break
            idxs.append(i); pos = i + 1
        if not idxs: raise SystemExit('NOT FOUND in %s: %r' % (ref, q))
        if len(idxs) > 1 and occ is None: raise SystemExit('AMBIGUOUS (%d) in %s: %r' % (len(idxs), ref, q))
        i = idxs[occ or 0]; a, b = nm[i], nm[i + len(qn) - 1] + 1
        prov = None
        if ref in NPS_MAN: prov = dict(url=NPS_MAN[ref].get('url'), fetched_utc=NPS_MAN[ref].get('fetched_at'), ledger='tmp/library/web/nps/MANIFEST.json (bt-web workstream)')
        elif ref in NPS_PAGES: prov = dict(url=NPS_PAGES[ref]['url'], fetched_utc=NPS_PAGES[ref]['retrieved'], ledger='GOVERNANCE/evidence_corrections/web-nps-landscape.jsonl (bt-web workstream)')
        cls = 'secondary (National Park Service report, United States government work; text layer of the PDF)' if ref not in NPS_PAGES else 'secondary (National Park Service web page, United States government work; saved text)'
        return dict(source_id=ref, source_class=cls, part=None, report_id=None, provenance=prov,
                    printed_page=c.get('pp'), pdf_page=nps_page(raw, a), quote=q, offset=[a, b], local_path=os.path.relpath(p, ROOT), match='exact (whitespace-normalised, case-sensitive)',
                    role=c['role'], note=c.get('note'))
    raise SystemExit('bad src ' + src)

def resolve(c):
    if c['src'] in ('ACQ', 'KIT', 'K2', 'NPSW', 'CA', 'OR1W'):
        rec = resolve_new(c)
    else:
        rec = resolve_old(c)
        if c.get('reading'): rec['reading'] = c['reading']
        if c.get('pp') and not rec.get('printed_page'): rec['printed_page'] = c['pp']
        if 'local_sha256' not in rec: rec['local_sha256'] = file_sha(os.path.join(ROOT, rec['local_path']))
    return attach_image(rec, c)

def load_specs():
    rows = []; mods = []
    for f in sorted(glob.glob(os.path.join(HERE, 'spec_*.py'))):
        if f.endswith('spec_lib.py'): continue
        spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        rows.extend(m.ROWS); mods.append(m)
    by = {r['id']: r for r in rows}
    for m in mods:
        if hasattr(m, 'apply'): m.apply(by)      # wave-4 addenda: edits to rows already specified above
    return rows

def main():
    prev = [json.loads(l) for l in open(os.path.join(HERE, '..', 'results.jsonl'), encoding='utf-8') if l.strip()]
    prev_by = {r['id']: r for r in prev}
    rc = [json.loads(l) for l in open(os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/OR-RECHECK/results.jsonl')) if l.strip()]
    rc = [r for r in rc if r['shard'] == 'fence-1']
    rows = load_specs()
    seen = {}
    for r in rows: seen[r['id']] = r
    missing = [i for i in prev_by if i not in seen]
    print('rows in specs:', len(seen), ' rows of the shard:', len(prev_by), ' missing:', missing)
    out = []; nc = 0
    for rid in prev_by:
        if rid not in seen: continue
        r = dict(seen[rid]); old = prev_by[rid]
        for s in r['sub_claims']:
            res = []
            for c in s['citations']:
                res.append(resolve(c)); nc += 1
            s['citations'] = res
        # recheck block
        olds = old['sources']
        rcl = [x for x in rc if x['row_id'] == rid]
        ok = 0
        for s in olds:
            q = norm_query(s['exact_quote']); part = int(s['report_id'].split('-')[1]); P = get_part(part)
            i = P.ntext.find(q)
            a, b = P.orig_span(i, i + len(q)) if i >= 0 else (None, None)
            if i >= 0 and [a, b] == s['offsets_in_raw_file'] and P.cite(a, b)['record'] == s['report_id'] and P.cite(a, b)['page'] == s['printed_page']: ok += 1
        recheck = dict(original_citations=len(olds), verbatim_offset_report_page_match=ok, or_recheck_lines=len(rcl),
                       or_recheck_found_yes=sum(1 for x in rcl if x['found'] == 'yes'), or_recheck_other=[dict(quote=x['quote'], found=x['found'], note=x['note']) for x in rcl if x['found'] != 'yes'],
                       method='tools/bt/or27_find normalised view; offsets are characters in the raw djvu text (tmp/library/or27)')
        rec = dict(id=rid, shard='fence-1', requirement='R14', fence_relevance=old.get('fence_relevance'), previous_status=old['status'], previous_tier=old['tier'],
                   verdict=r['verdict'], status=r['row_status'], row_status=r['row_status'], structures_refs=r['structures_refs'], pdf_claim=r['pdf_claim'], corrected_claim=r['corrected_claim'],
                   tier_summary=dict(__import__('collections').Counter(x['tier'] for x in r['sub_claims'])),
                   sub_claims=[dict(sc=rid + '.' + s['sc'], claim=s['claim'], tier=s['tier'], support=s['support'], citations=s['citations'], note=s['note']) for s in r['sub_claims']],
                   stays_unsupported=r['stays_unsupported'], conflicts_carried=r['conflicts_carried'], register_refs=r['register_refs'], blocked_host=r['blocked_host'],
                   product_consequence=r['product_consequence'], recheck=recheck, lookups=r['lookups'], changes_vs_previous=r['changes_vs_previous'], notes=r['notes'],
                   built='2026-11-14', revision='close-out 2026-11-13 (rev 1); reopened 2026-11-14 for page images and newly local texts (rev 2)')
        out.append(rec)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        for rec in out: f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print('wrote', len(out), 'rows,', nc, 'citations resolved ->', OUT)

if __name__ == '__main__':
    main()
