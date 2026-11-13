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

OUT = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-1.jsonl')
OR_IDX = json.load(open(os.path.join(ROOT, 'docs/battle-theatre/library/or27_index.json')))['records']
OR_BY_ID = {r['id']: r for r in OR_IDX}
WS9 = os.path.join(ROOT, 'tmp/library/ws9'); WS9P = os.path.join(WS9, 'prior')
NPSD = os.path.join(ROOT, 'tmp/library/web/nps')
EXTRA = os.path.join(ROOT, 'tmp/fence-1/dl')
OR_SHA = {1: '5c041e6ebc70cd4e33a325b411c7bec0b22ffa6dedbb71fbd4943fb57977a6ca', 2: '3d89c8396d3360cfe180d112d73f685603c95f68379d9dfb5a4f899133c86995', 3: '3c7212f2954d83606e38fb00337fcaf78f85193b56b79a341d1f28659f4d93c1'}
OR_PATH = {1: 'tmp/library/or27/cu31924077699761_djvu.txt', 2: 'tmp/library/or27/cu31924077728255_djvu.txt', 3: 'tmp/library/or27/cu31924077700262_djvu.txt'}
EXTRA_IDS = {'DAWES-1890': 'servsixthwiscon00dawerich/servsixthwiscon00dawerich_djvu.txt', 'MORHOUS-1879': 'reminiscencesof00morh/reminiscencesof00morh_djvu.txt', 'EDDY-1864': 'historyofsixtiet00eddy/historyofsixtiet00eddy_djvu.txt'}
CLASS = {'OR': 'primary (official report written 1863-65; Government Printing Office volume 1889, raw OCR, single witness)'}

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
def nps_text(sid):
    if sid not in _nt:
        p = os.path.join(NPSD, sid, sid + '.txt')
        raw = open(p, encoding='utf-8', newline='').read()
        nt, nm = build_nview(raw)
        _nt[sid] = (p, raw, nt, nm)
    return _nt[sid]

def page_hint(raw, off):
    """nearest preceding running-head page number in the djvu text (heuristic; a hint, not a citation page)"""
    lo = max(0, off - 7000); w = raw[lo:off]
    best = None
    for m in re.finditer(r'(?m)^[ \t]*(\d{1,4})[ \t]*$', w): best = m.group(1)
    for m in re.finditer(r'(?i)(?:gettysburg|at gettysburg)\.?\s+(\d{1,4})\b|\b(\d{1,4})\s+(?:new york|pennsylvania|maine|michigan|southern historical)\b', w):
        best = m.group(1) or m.group(2)
    return best

def nps_page(raw, off):
    last = None
    for m in re.finditer(r'=== PAGE (\d+) ===', raw[:off]): last = m.group(1)
    return last

def resolve(c):
    src, ref, q, occ = c['src'], c['ref'], c['quote'], c.get('occ')
    qn = norm_query(q)
    if src.startswith('OR'):
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
        return dict(source_id=ref, source_class=cls, part=None, report_id=None, printed_page=None, page_hint=page_hint(raw, a), quote=q, offset=[a, b],
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
        return dict(source_id=ref, source_class='secondary (National Park Service report, United States government work; text layer of the PDF)', part=None, report_id=None,
                    printed_page=None, pdf_page=nps_page(raw, a), quote=q, offset=[a, b], local_path=os.path.relpath(p, ROOT), match='exact (whitespace-normalised, case-sensitive)',
                    role=c['role'], note=c.get('note'))
    raise SystemExit('bad src ' + src)

def load_specs():
    rows = []
    for f in sorted(glob.glob(os.path.join(HERE, 'spec_*.py'))):
        if f.endswith('spec_lib.py'): continue
        spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        rows.extend(m.ROWS)
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
                   built='2026-11-13')
        out.append(rec)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        for rec in out: f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print('wrote', len(out), 'rows,', nc, 'citations resolved ->', OUT)

if __name__ == '__main__':
    main()
