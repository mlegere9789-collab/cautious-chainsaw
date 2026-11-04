"""Validator for docs/battle-theatre/terrain/terrain_sources.json (PDF B.9.1 catalog, Tables 1-5) and its probe file.

Usage:  python tools/bt/terrain_check.py            validate, print a summary, exit 1 on any failure
        python tools/bt/terrain_check.py --require-probe   also fail if the probe has not been run

Checks: exactly 45 rows numbered 1..45 in order; table sizes 13/7/11/10/4; required fields per table (only columns the PDF prints for that table);
URLs well-formed and each one present, character for character, in the PDF text (whitespace removed), so no URL was invented or altered;
tier values only R1-R4 (or the printed "Not used"); Tables 1 and 5 carry a printed tier on every row; rows that the PDF itself flags unverified are
flagged; the 13-item unverified list; the probe file (if present) stays within the 150-request cap, covers every source URL, uses the declared
status vocabulary and agrees with the access_status written into the sources file.  Self-tests at the end prove the checker fails on bad data."""
import copy
import json
import os
import re
import sys
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DIR = os.path.join(ROOT, 'docs', 'battle-theatre', 'terrain')
SRC = os.path.join(DIR, 'terrain_sources.json')
PROBE = os.path.join(DIR, 'terrain_sources_probe.json')
PDF_TXT = os.path.join(ROOT, 'docs', 'battle-theatre', 'BIBLE', 'plan-clean.txt')

TABLE_SIZES = {1: 13, 2: 7, 3: 11, 4: 10, 5: 4}
TABLE_RANGES = {1: (1, 13), 2: (14, 20), 3: (21, 31), 4: (32, 41), 5: (42, 45)}
# columns the PDF prints per table, beyond number/source (source is `name`)
PRINTED = {
    1: ['type', 'what_it_gives', 'access_url_text', 'format', 'scale_resolution', 'licence', 'limits', 'tier_printed'],
    2: ['type', 'what_it_gives', 'access_url_text', 'format', 'scale_resolution', 'licence', 'limits'],
    3: ['what_it_gives', 'access_url_text', 'format', 'scale_resolution', 'licence'],   # type may be null (row 24 prints no cell for it)
    4: ['type', 'what_it_gives', 'access_url_text'],
    5: ['what_it_gives', 'access_url_text', 'limits', 'tier_printed'],
}
NO_URL_ALLOWED = {7}
MUST_BE_FLAGGED = {2, 4, 5, 7, 10, 11, 12, 13, 14, 15, 17, 18, 19, 23, 34, 35, 36, 39, 41, 44}
TIERS = {'R1', 'R2', 'R3', 'R4'}
STATUS_ROW = {'reachable', 'partially-reachable', 'blocked', 'unreachable', 'print-only', 'viewer-only', 'request-only', 'no-url', 'not_probed'}
STATUS_URL = {'ok', 'redirect', 'blocked', 'robots_disallowed', 'not_found', 'server_error', 'timeout', 'tls_error', 'connection_error',
              'not_probed_robots', 'robots_unavailable', 'moved_to_search', 'not_probed_cap', 'error'}
REQUIRED_TOP = ['rows', 'tier_definitions', 'unverified_list', 'unverified_list_postscript', 'method_limits']
CAP = 150


def url_ok(u):
    if not isinstance(u, str) or re.search(r'\s', u):
        return False
    p = urlparse(u)
    return p.scheme in ('http', 'https') and '.' in p.netloc and not p.netloc.startswith('.') and len(u) < 600


def check_sources(doc, pdf_norm=None):
    errs = []
    for k in REQUIRED_TOP:
        if k not in doc:
            errs.append('missing top-level key ' + k)
    rows = doc.get('rows') or []
    if len(rows) != 45:
        errs.append('expected 45 rows, found %d' % len(rows))
    if [r.get('number') for r in rows] != list(range(1, 46)):
        errs.append('row numbers are not 1..45 in order')
    sizes = {}
    for r in rows:
        sizes[r.get('table')] = sizes.get(r.get('table'), 0) + 1
    if sizes != TABLE_SIZES:
        errs.append('table sizes %s != %s' % (sizes, TABLE_SIZES))
    td = doc.get('tier_definitions') or {}
    if set(td) != TIERS:
        errs.append('tier_definitions must define exactly R1-R4')
    for r in rows:
        n = r.get('number')
        t = r.get('table')
        tag = 'row %s' % n
        lo, hi = TABLE_RANGES.get(t, (0, -1))
        if not (isinstance(n, int) and lo <= n <= hi):
            errs.append('%s: number outside table %s range %s-%s' % (tag, t, lo, hi))
        if not (r.get('name') or '').strip():
            errs.append(tag + ': name empty')
        if not isinstance(r.get('pdf_page'), int) or not 103 <= r['pdf_page'] <= 110:
            errs.append(tag + ': pdf_page outside 103-110')
        for c in PRINTED.get(t, []):
            if r.get(c) is None or (isinstance(r.get(c), str) and not r[c].strip()):
                errs.append('%s: column %s is a printed column of table %s but is empty' % (tag, c, t))
        if t in (1, 2, 4) and (r.get('type') or '').strip() == '':
            pass
        # tiers
        codes = r.get('tier_codes')
        if not isinstance(codes, list) or not set(codes) <= TIERS:
            errs.append('%s: tier_codes must be a list of R1-R4' % tag)
            codes = []
        ts = r.get('tier_status')
        if t in (1, 5):
            if n == 9:
                if ts != 'not_used' or r.get('tier_printed') != 'Not used' or codes:
                    errs.append('row 9 must carry the printed tier "Not used" and no R-code')
            else:
                if ts != 'printed' or not codes:
                    errs.append('%s: tier printed in table %s but missing' % (tag, t))
                else:
                    for c in codes:
                        if c not in (r.get('tier_printed') or ''):
                            errs.append('%s: tier code %s not in printed tier text' % (tag, c))
        else:
            if ts != 'not_printed_in_table' or codes or r.get('tier_printed') is not None:
                errs.append('%s: table %s prints no tier column; tier must be null / not_printed_in_table' % (tag, t))
        # columns_not_printed consistency
        allf = {'source', 'type', 'what_it_gives', 'access_url', 'format', 'scale_resolution', 'licence', 'limits', 'tier'}
        printed_cols = {'source', 'type', 'what_it_gives', 'access_url', 'format', 'scale_resolution', 'licence', 'limits', 'tier'}
        cnp = set(r.get('columns_not_printed') or [])
        if not cnp <= allf:
            errs.append(tag + ': columns_not_printed has unknown names')
        # urls
        urls = r.get('urls')
        if not isinstance(urls, list):
            errs.append(tag + ': urls must be a list')
            urls = []
        if not urls and n not in NO_URL_ALLOWED:
            errs.append(tag + ': no URL (only row 7 prints none)')
        seen = set()
        for u in urls:
            uu = u.get('url') if isinstance(u, dict) else None
            if not url_ok(uu):
                errs.append('%s: malformed URL %r' % (tag, uu))
                continue
            if uu in seen:
                errs.append('%s: duplicate URL %s' % (tag, uu))
            seen.add(uu)
            if pdf_norm is not None and uu not in pdf_norm:
                errs.append('%s: URL not found in the PDF text (whitespace removed): %s' % (tag, uu))
        if n in MUST_BE_FLAGGED and not r.get('pdf_unverified_flags'):
            errs.append('%s: the PDF flags this row unverified/limited but pdf_unverified_flags is empty' % tag)
        if not (r.get('access_kind_from_pdf') or '').strip():
            errs.append(tag + ': access_kind_from_pdf empty')
        if r.get('access_status') not in STATUS_ROW:
            errs.append('%s: access_status %r not in vocabulary' % (tag, r.get('access_status')))
    # access kinds the PDF states
    by = {r.get('number'): r for r in rows}
    if rows:
        for n, kind in ((3, 'viewer-only'), (28, 'viewer-only'), (5, 'print-only'), (6, 'print-only'), (14, 'request-only')):
            if not (by[n].get('access_kind_from_pdf') or '').startswith(kind):
                errs.append('row %d must be recorded as %s' % (n, kind))
    # unverified list
    ul = doc.get('unverified_list') or []
    if len(ul) != 13:
        errs.append('unverified_list must have 13 items (PDF page 108), found %d' % len(ul))
    for i in ul:
        if not (i.get('item') and i.get('why_unverified')):
            errs.append('unverified_list entry incomplete: %r' % i)
    pst = doc.get('unverified_list_postscript') or {}
    if not (pst.get('item') and pst.get('why_unverified') and pst.get('urls')):
        errs.append('unverified_list_postscript incomplete')
    for u in pst.get('urls') or []:
        if not url_ok(u):
            errs.append('postscript malformed URL %r' % u)
        elif pdf_norm is not None and u not in pdf_norm:
            errs.append('postscript URL not in PDF text: ' + u)
    return errs


def check_probe(doc, probe):
    errs = []
    if probe.get('schema') != 'bt-terrain-sources-probe/1':
        errs.append('probe: bad schema')
    if not (probe.get('user_agent') or '').strip():
        errs.append('probe: user_agent empty')
    rm = probe.get('requests_made')
    if not isinstance(rm, int) or rm > CAP or rm < 1:
        errs.append('probe: requests_made %r outside 1..%d' % (rm, CAP))
    want = set()
    for r in doc.get('rows', []):
        for u in r.get('urls', []):
            want.add(u['url'])
    for u in (doc.get('unverified_list_postscript') or {}).get('urls', []):
        want.add(u)
    got = {x.get('url'): x for x in probe.get('urls', [])}
    for u in sorted(want - set(got)):
        errs.append('probe: URL not covered: ' + u)
    for u in sorted(set(got) - want):
        errs.append('probe: URL not in catalog: ' + u)
    for u, x in got.items():
        if x.get('status') not in STATUS_URL:
            errs.append('probe: status %r for %s not in vocabulary' % (x.get('status'), u))
        if x.get('status') == 'ok' and not x.get('http_status'):
            errs.append('probe: ok without http_status: ' + u)
        if x.get('status') == 'redirect' and not x.get('location'):
            errs.append('probe: redirect without location: ' + u)
    prow = {x['number']: x for x in probe.get('rows', [])}
    for r in doc.get('rows', []):
        p = prow.get(r['number'])
        if p is None:
            errs.append('probe: row %s missing' % r['number'])
        elif p.get('access_status') != r.get('access_status'):
            errs.append('probe: row %s access_status %s != sources file %s' % (r['number'], p.get('access_status'), r.get('access_status')))
    if probe.get('urls') and sum(1 for x in probe['urls'] if x.get('status') in ('blocked',)) and not probe.get('policy'):
        errs.append('probe: policy statement missing')
    return errs


def main():
    require_probe = '--require-probe' in sys.argv
    if not os.path.exists(SRC):
        print('FAIL: %s missing' % SRC)
        return 1
    doc = json.load(open(SRC, encoding='utf-8'))
    pdf_norm = None
    if os.path.exists(PDF_TXT):
        pdf_norm = re.sub(r'\s+', '', open(PDF_TXT, encoding='utf-8').read())
    else:
        print('WARN: PDF text not found; URL-in-PDF check skipped')
    errs = check_sources(doc, pdf_norm)
    probe = None
    if os.path.exists(PROBE):
        probe = json.load(open(PROBE, encoding='utf-8'))
        errs += check_probe(doc, probe)
    elif require_probe:
        errs.append('probe file missing')
    else:
        print('NOTE: probe file not present (run tools/bt/terrain_probe.py)')

    # self-tests: the checker must fail on bad data
    bad = []
    d = copy.deepcopy(doc)
    d['rows'].pop()
    bad.append(('row removed', d))
    d = copy.deepcopy(doc)
    d['rows'][0]['urls'][0]['url'] = 'htp:/not a url'
    bad.append(('malformed URL', d))
    d = copy.deepcopy(doc)
    d['rows'][0]['tier_codes'] = ['R9']
    bad.append(('bad tier', d))
    d = copy.deepcopy(doc)
    d['rows'][3]['urls'][0]['url'] = 'https://example.org/invented'
    bad.append(('URL not in PDF', d))
    d = copy.deepcopy(doc)
    d['rows'][10]['what_it_gives'] = ''
    bad.append(('empty required field', d))
    d = copy.deepcopy(doc)
    d['unverified_list'].pop()
    bad.append(('unverified list short', d))
    st_errs = []
    for name, dd in bad:
        e = check_sources(dd, pdf_norm if name == 'URL not in PDF' else (pdf_norm or None))
        if name == 'URL not in PDF' and pdf_norm is None:
            continue
        if not e:
            st_errs.append('self-test: checker did not fail on "%s"' % name)
    errs += st_errs

    rows = doc.get('rows', [])
    print('rows %d | urls %d | rows with printed tier %d | tier not printed %d | not used %d' % (
        len(rows), sum(len(r.get('urls', [])) for r in rows), sum(1 for r in rows if r.get('tier_status') == 'printed'),
        sum(1 for r in rows if r.get('tier_status') == 'not_printed_in_table'), sum(1 for r in rows if r.get('tier_status') == 'not_used')))
    if probe:
        print('probe: requests %s | url status %s | row access_status %s' % (
            probe.get('requests_made'), probe.get('counts_by_url_status'), probe.get('counts_by_row_access_status')))
    if errs:
        for e in errs:
            print('FAIL:', e)
        print('%d failure(s)' % len(errs))
        return 1
    print('terrain_check: OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
