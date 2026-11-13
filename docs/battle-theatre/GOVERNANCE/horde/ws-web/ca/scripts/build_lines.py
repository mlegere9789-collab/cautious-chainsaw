#!/usr/bin/env python3
"""Build the evidence lines of the newspapers task from the curated claim modules.

Input : claims_*.py modules next to this script, each with a list CLAIMS of dicts:
    ids       : list of target ids (a timeline row 'E-004' or 'T1-003', a sub-requirement 'R22.0004' or 'R03.C-045', a topic 'R15.0000')
    key       : short unique key of the claim inside the module
    sub_claim : what the paper literally prints, in the words of the claim (never more than the quote supports)
    tier      : documented | inferred | plausible-procedural   (see DD-NEWS-01)
    state_date: date or window of the event the claim is about
    cites     : list of dicts {page, quote, [dateline], [attribution], [reprint], [ocr_check], [note]}
                 page  = 'sn83030213/1863-11-20/ed-1/seq-1' (a page saved under tmp/library/web/ca/pages)
                 quote = verbatim passage of the saved OCR text (whitespace-normalised; line-end hyphens may be joined)
                 reprint = {'status': original|reprint|wire|unknown, 'from': text as printed or None, 'basis': verbatim attribution text or note}
                 ocr_check = {'method': 'none'|'image crop viewed', 'result': ..., 'corrections': [[saved, read], ...]}
    remains    : what the quote does not support
    caution    : optional hedge for the integrators (conflicts with the row etc.)
    row_effect : optional: 'agrees' | 'differs' | 'adds' with the row's claim, and what
Output: ../../../../timeline_corrections/web-newspapers.jsonl  (ids of timeline rows: T*, E*)
        ../../../../evidence_corrections/web-newspapers.jsonl  (ids of requirement items: R*)
A line is written once per (id, claim); the first cite is 'citation', the others 'more_citations'.
The script refuses a quote that is not found in the saved page text, and reports near misses.
"""
import difflib, glob, importlib.util, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib

GOV = os.path.abspath(os.path.join(calib.CA_DOCS, '..', '..', '..'))
OUT_T = os.path.join(GOV, 'timeline_corrections', 'web-newspapers.jsonl')
OUT_E = os.path.join(GOV, 'evidence_corrections', 'web-newspapers.jsonl')
RETRIEVED = '2026-11-13'

MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


def load_modules():
    claims = []
    for p in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'claims_*.py'))):
        spec = importlib.util.spec_from_file_location(os.path.basename(p)[:-3], p)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        for c in m.CLAIMS:
            c = dict(c)
            c['_module'] = os.path.basename(p)[:-3]
            claims.append(c)
    return claims


_titles = None


def paper_display(lccn):
    """e.g. 'New-York daily tribune (New-York [N.Y.])' from the title strings of saved searches."""
    global _titles
    if _titles is None:
        _titles = {}
        for pid, m in calib.all_search_results().items():
            t = m.get('image_title') or ''
            mm = re.match(r'^Image \d+ of (.*), (?:[A-Z][a-z]+ \d{1,2}, \d{4})$', t)
            if mm:
                _titles.setdefault(m['lccn'], mm.group(1))
    return _titles.get(lccn)


def locate(page_id, quote):
    text = calib.page_text(page_id)
    q = calib.norm(quote)
    for variant, dh in (('plain', False), ('line-end hyphens joined', True)):
        t = calib.norm(text, dehyphen=dh)
        i = t.find(q)
        if i >= 0:
            return variant, i, t
    # near miss report
    t = calib.norm(text, dehyphen=True)
    sm = difflib.SequenceMatcher(None, t, q, autojunk=False)
    best = sm.find_longest_match(0, len(t), 0, len(q))
    return None, best, t


def fmt_date(d):
    y, m, dd = d.split('-')
    return '%s %d, %s' % (MONTHS[int(m) - 1], int(dd), y)


def citation(c, man):
    pid = c['page']
    m = man[pid]
    variant, off, t = locate(pid, c['quote'])
    if variant is None:
        raise SystemExit('QUOTE NOT FOUND in %s:\n  %s\n  longest common piece: %r' % (pid, c['quote'][:200], t[off.a:off.a + off.size][:200] if off else None))
    disp = paper_display(m['lccn']) or m['paper']
    place = None
    mm = re.search(r'\((.*)\)\s*$', disp)
    if mm:
        place = mm.group(1)
    for extra in ('dateline', 'attribution'):
        if c.get(extra):
            v, o, _ = locate(pid, c[extra])
            if v is None:
                raise SystemExit('%s NOT FOUND in %s: %s' % (extra, pid, c[extra][:120]))
    ctx_before = t[max(0, off - 400):off] if c.get('with_context', True) else None
    rep = c.get('reprint') or {'status': 'unknown', 'from': None, 'basis': 'not stated on the page text read'}
    ocr = c.get('ocr_check') or {'method': 'none', 'result': 'OCR text of the page only; the print was not viewed', 'corrections': []}
    cit = {
        'source_id': 'CA-%s-%s-ed%d-seq%d' % (m['lccn'], m['date'], m['edition'], m['seq']),
        'source_class': 'contemporary newspaper page (1863), digitised by the Library of Congress (Chronicling America); text is the OCR layer of the page',
        'title': '%s, %s, image %d' % (disp, fmt_date(m['date']), m['seq']),
        'newspaper': disp.split(' (')[0] if disp else m['paper'],
        'lccn': m['lccn'],
        'place_of_printing': place,
        'issue_date': m['date'],
        'edition': m['edition'],
        'image_seq': m['seq'],
        'printed_page': c.get('printed_page'),
        'url': m['resource_url'],
        'text_url': m['text_url'],
        'retrieved': RETRIEVED,
        'local_path': m['local_path'],
        'text_sha256': m['text_sha256'],
        'page_chars': m['chars'],
        'text_variant': 'whitespace collapsed' + ('' if variant == 'plain' else ', line-end hyphens joined'),
        'quote': calib.norm(c['quote']),
        'quote_offset': off,
        'dateline': c.get('dateline'),
        'attribution': c.get('attribution'),
        'reprint': rep,
        'ocr_check': ocr,
        'context_before': ctx_before,
    }
    if c.get('note'):
        cit['note'] = c['note']
    return cit


def build():
    man = calib.load_manifest()
    claims = load_modules()
    seen = set()
    lines_t, lines_e = [], []
    for c in claims:
        for tid in c['ids']:
            k = (tid, c['_module'], c['key'])
            if k in seen:
                raise SystemExit('duplicate claim key %s' % (k,))
            seen.add(k)
        cites = [citation(x, man) for x in c['cites']]
        distinct_papers = sorted({x['lccn'] for x in cites})
        for tid in c['ids']:
            line = {
                'id': tid,
                'shard': 'web-newspapers',
                'xid': 'NEWS-%s-%s' % (c['_module'].replace('claims_', ''), c['key']) + ('' if len(c['ids']) == 1 else ''),
                'kind': 'epilogue row' if re.match(r'^E-\d+$', tid) else ('timeline row' if re.match(r'^T\d-\d+$', tid) else 'requirement item'),
                'sub_claim': c['sub_claim'],
                'tier': c['tier'],
                'verdict': c.get('verdict', 'partially_supported'),
                'state_date': c.get('state_date'),
                'citation': cites[0],
                'more_citations': cites[1:],
                'papers': len(distinct_papers),
                'independence': c.get('independence') or 'see reprint field of each citation; a count of papers is not a count of independent witnesses',
                'row_effect': c.get('row_effect'),
                'remains_unsupported': c.get('remains') or 'one contemporary newspaper report; the underlying records, the other papers and the non-newspaper sources were not read for this line',
            }
            if c.get('caution'):
                line['caution'] = c['caution']
            if c.get('conflict'):
                line['conflict'] = c['conflict']
            (lines_t if re.match(r'^(E|T\d)-\d+$', tid) else lines_e).append(line)
            if c.get('both') and re.match(r'^(E|T\d)-\d+$', tid):
                pass
    return lines_t, lines_e


def main():
    lt, le = build()
    for path, lines in ((OUT_T, lt), (OUT_E, le)):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            for l in lines:
                f.write(json.dumps(l, ensure_ascii=False, sort_keys=True) + '\n')
        print('%s: %d lines' % (os.path.relpath(path, calib.ROOT), len(lines)))


if __name__ == '__main__':
    main()
