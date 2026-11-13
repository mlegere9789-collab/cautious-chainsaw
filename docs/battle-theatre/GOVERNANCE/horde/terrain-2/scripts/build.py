"""Build GOVERNANCE/evidence_corrections/terrain-2.jsonl from the row specs (spec_*.py) and re-verify every citation.
Run: python3 -I build.py   (read-only on all source texts; writes only the jsonl and tmp/terrain-2/build.log)
Every citation quote must be found verbatim (whitespace-normalised, case-sensitive, hyphenation joined) in the named report (OR) or
source text, exactly once unless an occurrence index is given; otherwise the build stops with the failing row and quote."""
import os, sys, re, json, glob, importlib.util, collections, datetime, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tlib, spec_lib
from tlib import ROOT, OR_BY_ID, OR_SHA, OR_PATH, get_part, norm_query
OUT = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/evidence_corrections/terrain-2.jsonl')
RESULTS = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/terrain-2/results.jsonl')
RECHECK = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/horde/OR-RECHECK/results.jsonl')
CLASS = {'OR': 'primary (official report written 1863-65; Government Printing Office volume 1889, raw OCR, single witness unless a second scan is listed)'}
LIB_CLASS = {}  # filled by lib_class()
_SHA_CACHE = {}
def file_sha(path):
    if path not in _SHA_CACHE:
        _SHA_CACHE[path] = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    return _SHA_CACHE[path]


def lib_class(sid):
    if sid.startswith('ADAMS-SENTINEL') or sid.startswith('GBG-COMPILER'):
        return 'primary (1863 local newspaper, raw OCR, single witness)'
    if sid.startswith(('ALEXANDER', 'LONGSTREET', 'HASKELL', 'MEADE-LL', 'BL-', 'BACH', 'JACOBS', 'FREMANTLE', 'EDDY', 'DAWES', 'MORHOUS', 'TPIERCE', 'PIERCE', 'OH-', 'IN-', 'MN-', 'VT-', 'NJ-')):
        return 'participant or contemporary secondary (published 1864-1916 memoir, history or address; raw OCR, single witness)'
    if sid.startswith(('NY-GB', 'PA-GB', 'ME-GB', 'MI-GB')):
        return 'state commission volume (regimental or battery history and monument dedication addresses, 1888-1914; raw OCR, single witness)'
    if sid.startswith('FOX'):
        return 'secondary (Fox, Regimental Losses, 1889; raw OCR, single witness)'
    return 'secondary (published 19th/early-20th-century book; raw OCR, single witness)'

ANCHOR = ' >>> '
MAXSPAN = 700

def spans_of(nt, q, ok=None):
    """all (start, end) spans in the normalised text nt for a quote q. A quote 'first >>> last' is an anchored span: from an occurrence of
    'first' to the nearest following occurrence of 'last' (within MAXSPAN characters); the stored quote is the text of that span.
    ok(a_norm_index) filters the start (e.g. inside a report's offset range)."""
    out = []
    if ANCHOR in q:
        f, l = q.split(ANCHOR, 1)
        fn, ln = norm_query(f), norm_query(l)
        pos = 0
        while True:
            i = nt.find(fn, pos)
            if i < 0: break
            pos = i + 1
            if ok is not None and not ok(i): continue
            j = nt.find(ln, i + len(fn))
            if j < 0 or j + len(ln) - i > MAXSPAN: continue
            out.append((i, j + len(ln)))
    else:
        qn = norm_query(q)
        pos = 0
        while True:
            i = nt.find(qn, pos)
            if i < 0: break
            pos = i + 1
            if ok is not None and not ok(i): continue
            out.append((i, i + len(qn)))
    return out

def resolve(c):
    src, ref, q, occ = c['src'], c['ref'], c['quote'], c.get('occ')
    if src.startswith('OR'):
        part = int(src[2]); rid = 'OR27-%d-%s' % (part, ref) if not ref.startswith('OR27') else ref
        P = get_part(part); rec = OR_BY_ID[rid]
        def ok(i):
            a, _ = P.orig_span(i, i + 1)
            return rec['start_offset'] <= a < rec['end_offset']
        sp = spans_of(P.ntext, q, ok)
        if not sp: raise SystemExit('NOT FOUND in %s: %r' % (rid, q))
        if len(sp) > 1 and occ is None: raise SystemExit('AMBIGUOUS (%d) in %s: %r (give occ)' % (len(sp), rid, q))
        i0, i1 = sp[occ or 0]
        a, b = P.orig_span(i0, i1); quote = P.ntext[i0:i1]
        pi = tlib.page_info(part, a, b)
        return dict(source_id='OR-27-%d' % part, source_class=CLASS['OR'], part=part, report_id=rid, report_author=((rec.get('rank') or '') + ' ' + (rec.get('author') or '')).strip(),
                    printed_page=pi['page'], page_basis=pi['basis'], quote=quote, offset=[a, b], local_path=OR_PATH[part], local_sha256=OR_SHA[part],
                    match='exact (whitespace-normalised, case-sensitive)', second_witness=tlib.witness_check(part, quote), role=c['role'], note=c.get('note'))
    if src == 'LIB':
        p, raw, nt, nm = tlib.lib_text(ref)
        sp = spans_of(nt, q)
        if not sp: raise SystemExit('NOT FOUND in %s: %r' % (ref, q))
        if len(sp) > 1 and occ is None: raise SystemExit('AMBIGUOUS (%d) in %s: %r' % (len(sp), ref, q))
        i0, i1 = sp[occ or 0]; a, b = nm[i0], nm[i1 - 1] + 1; quote = nt[i0:i1]
        return dict(source_id=ref, source_class=lib_class(ref), part=None, report_id=None, printed_page=c.get('page'), page_basis=('running head read in the text layer (checked by hand)' if c.get('page') else 'heuristic hint only (nearest preceding number); not a citation page'), page_hint=tlib.page_hint(raw, a), quote=quote, offset=[a, b],
                    local_path=os.path.relpath(p, ROOT), local_sha256=file_sha(p), match='exact (whitespace-normalised, case-sensitive)', role=c['role'], note=c.get('note'))
    if src == 'NPS':
        p, raw, nt, nm = tlib.nps_text(ref)
        sp = spans_of(nt, q)
        if not sp: raise SystemExit('NOT FOUND in %s: %r' % (ref, q))
        if len(sp) > 1 and occ is None: raise SystemExit('AMBIGUOUS (%d) in %s: %r' % (len(sp), ref, q))
        i0, i1 = sp[occ or 0]; a, b = nm[i0], nm[i1 - 1] + 1; quote = nt[i0:i1]
        pg = None
        for mm in re.finditer(r'=== PAGE (\d+) ===', raw[:a]): pg = mm.group(1)
        return dict(source_id=ref, source_class='secondary (National Park Service document, United States government work; text layer of the PDF)', part=None, report_id=None,
                    printed_page=c.get('page'), pdf_page=pg, quote=quote, offset=[a, b], local_path=os.path.relpath(p, ROOT), local_sha256=file_sha(p), match='exact (whitespace-normalised, case-sensitive)',
                    role=c['role'], note=c.get('note'))
    raise SystemExit('bad src ' + src)

def load_specs():
    rows = []
    for f in sorted(glob.glob(os.path.join(HERE, 'spec_g*.py')) + glob.glob(os.path.join(HERE, 'spec_r*.py'))):
        spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        rows.extend(m.ROWS)
    return rows

CITE_RX = re.compile(r'pt\.(\d), (OR27-\d-[RSD]\d+(?:-\d+)?)\s*(.*?), p\. (.+)$')

def recheck_block(old, rcl):
    """re-match every supporting passage of the 2026-11-04 row against the local Official Records; compare with the claimed report and page."""
    n = ok_quote = ok_report = ok_page = 0; detail = []
    for sp in old.get('supporting_passages') or []:
        n += 1
        m = CITE_RX.search(sp['cite'])
        part = int(m.group(1)); rid = m.group(2); claimed_page = m.group(4).strip()
        P = get_part(part); qn = norm_query(sp['quote'])
        i = P.ntext.find(qn)
        if i < 0:
            detail.append(dict(quote=sp['quote'], found=False)); continue
        a, b = P.orig_span(i, i + len(qn)); c = P.cite(a, b); pi = tlib.page_info(part, a, b)
        ok_quote += 1
        rep = (c['record'] == rid); ok_report += 1 if rep else 0
        cp = re.sub(r'[~\s]', '', claimed_page.split('(')[0])
        pg = pi['page']; pm = (cp == pg) or (pg.startswith('~') and False)
        # a claimed page equal to the refined page, or the claimed '~N (lo-hi)' range containing the refined page
        mm = re.search(r'\((\d+)-(\d+)\)', claimed_page)
        if not pm and mm and pg.isdigit() and int(mm.group(1)) <= int(pg) <= int(mm.group(2)): pm = True
        ok_page += 1 if pm else 0
        detail.append(dict(quote=sp['quote'][:80], found=True, report_match=rep, claimed_page=claimed_page, found_page=pg, page_basis=pi['basis'], offset=[a, b]))
    return dict(original_passages=n, verbatim_in_local_or=ok_quote, report_id_match=ok_report, page_match_or_range_contains=ok_page,
                or_recheck_lines=len(rcl), or_recheck_found_yes=sum(1 for x in rcl if x['found'] == 'yes'),
                or_recheck_other=[dict(quote=x['quote'], found=x['found'], note=x['note']) for x in rcl if x['found'] != 'yes'],
                page_or_report_drift=[d for d in detail if d.get('found') and not (d['report_match'])] +
                                     [d for d in detail if d.get('found') and d['report_match'] and str(d['claimed_page']).replace('~', '').split(' ')[0] != str(d['found_page']).replace('~', '').split(' ')[0]],
                method='tools/bt/or27_find normalised view; offsets are characters in the raw djvu text (tmp/library/or27); page via running head, else the garbled head read in the text')

def main():
    only = None; dry = '--dry' in sys.argv
    if '--only' in sys.argv: only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    prev = [json.loads(l) for l in open(RESULTS, encoding='utf-8') if l.strip()]
    prev_by = {r['id']: r for r in prev}
    rc = [json.loads(l) for l in open(RECHECK, encoding='utf-8') if l.strip()]
    rc = [r for r in rc if r['shard'] == 'terrain-2']
    rows = load_specs()
    seen = {r['id']: r for r in rows}
    missing = [i for i in prev_by if i not in seen and (only is None or i in only)]
    extra = [i for i in seen if i not in prev_by]
    print('rows in specs:', len(seen), ' rows of the shard:', len(prev_by), ' missing:', missing, ' extra:', extra)
    out = []; nc = 0
    for rid in prev_by:
        if rid not in seen or (only is not None and rid not in only): continue
        r = dict(seen[rid]); old = prev_by[rid]
        for s in r['sub_claims']:
            res = []
            for c in s['citations']:
                try:
                    res.append(resolve(c)); nc += 1
                except SystemExit as e:
                    raise SystemExit('ROW %s sub %s: %s' % (rid, s['sc'], e))
            s['citations'] = res
        rcl = [x for x in rc if x['row_id'] == rid]
        rec = dict(id=rid, shard='terrain-2', requirement='R13', previous_status=old['status'], previous_tier=old['tier'], previous_verdict=old['verdict'],
                   verdict=r['verdict'], status=r['row_status'], row_status=r['row_status'], structures_refs=r['structures_refs'], pdf_claim=r['pdf_claim'],
                   corrected_claim=r['corrected_claim'], tier_summary=dict(collections.Counter(x['tier'] for x in r['sub_claims'])),
                   support_summary=dict(collections.Counter(x['support'] for x in r['sub_claims'])),
                   sub_claims=[dict(sc=rid + '.' + s['sc'], kind=s['kind'], claim=s['claim'], tier=s['tier'], support=s['support'], citations=s['citations'], note=s['note']) for s in r['sub_claims']],
                   stays_unsupported=r['stays_unsupported'], conflicts_carried=r['conflicts_carried'], register_refs=r['register_refs'], blocked_host=r['blocked_host'],
                   product_consequence=r['product_consequence'], recheck=recheck_block(old, rcl), lookups=r['lookups'], changes_vs_previous=r['changes_vs_previous'],
                   notes=r['notes'], built=datetime.date.today().isoformat())
        out.append(rec)
    if dry:
        print('dry run: %d rows, %d citations resolved, nothing written' % (len(out), nc)); return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        for rec in out: f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print('wrote', len(out), 'rows,', nc, 'citations resolved ->', OUT)

if __name__ == '__main__':
    main()
