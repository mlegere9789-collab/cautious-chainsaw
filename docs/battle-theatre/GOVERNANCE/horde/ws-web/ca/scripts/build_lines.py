#!/usr/bin/env python3
"""Build the evidence lines of the newspapers task from the curated claim modules.

Input : claims_*.py modules next to this script, each with a list CLAIMS of dicts:
    ids       : list of target ids (timeline row 'T1-003', epilogue row 'E-004', requirement item 'R22.0004', 'R03.C-045', topic 'R15.0000')
    key       : short key, unique inside the module
    sub_claim : what the paper literally prints, in the words of the claim (never more than the quotes support)
    tier      : documented | inferred | plausible-procedural   (DD-NEWS-01)
    state_date: date or window of the event the claim is about
    cites     : list of cite dicts:
                  page   'sn83030213/1863-11-20/ed-1/seq-1'  (a page saved under tmp/library/web/ca/pages)
                  quote  verbatim passage of the saved reading text, or
                  span   (start_text, end_text): the passage from the first to the end of the second (both verbatim, found in order)
                  dehyphen True: line-end hyphen breaks joined before matching
                  dateline / attribution : verbatim strings of the same page printed with the passage (checked to exist)
                  reprint {'status': original|reprint|wire|unknown, 'from': text as printed or None, 'basis': ...}
                  img    tag of an image crop taken with crop_quote.py (images.jsonl); reading = what the print reads there;
                         corrections = [[ocr text, printed text], ...]
                  printed_page, note
    remains   : what the quotes do not support;  row_effect : agrees | differs | adds + words;  caution, conflict : optional
Output: ../../../../timeline_corrections/web-newspapers.jsonl  (ids T*, E*)
        ../../../../evidence_corrections/web-newspapers.jsonl  (ids R*)
One line per (id, claim); the first cite is 'citation', the others 'more_citations'. A quote that is not found is an error.
"""
import difflib, glob, importlib.util, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib, rebuild_cols

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


_WORDS = {}


def page_words(page_id):
    if page_id not in _WORDS:
        man = calib.load_manifest()[page_id]
        _WORDS[page_id] = rebuild_cols.rebuild(os.path.join(calib.ROOT, man['alto_gz_path']))
    return _WORDS[page_id]


def views(page_id):
    text = calib.page_text(page_id)
    return {'plain': calib.norm(text), 'line-end hyphens joined': calib.norm(text, dehyphen=True)}


def resolve_quote(c):
    """Return (quote, variant, offset). span: from the first marker to the end of the second marker (plain view first)."""
    pid = c['page']
    v = views(pid)
    order = ['line-end hyphens joined', 'plain'] if c.get('dehyphen') else ['plain', 'line-end hyphens joined']
    if c.get('span'):
        a, b = c['span']
        for name in order:
            t = v[name]
            i = t.find(a)
            if i < 0:
                continue
            j = t.find(b, i + len(a) - len(a))
            if j < 0:
                continue
            end = j + len(b)
            # whole tokens: widen to the surrounding whitespace so that the quote starts and ends on token edges
            while i > 0 and t[i - 1] != ' ':
                i -= 1
            while end < len(t) and t[end] != ' ':
                end += 1
            return t[i:end], name, i
        raise SystemExit('SPAN NOT FOUND in %s: %r ... %r' % (pid, a[:80], b[:80]))
    q = calib.norm(c['quote'])
    for name in order:
        i = v[name].find(q)
        if i >= 0:
            return q, name, i
    t = v['line-end hyphens joined']
    sm = difflib.SequenceMatcher(None, t, q, autojunk=False)
    best = sm.find_longest_match(0, len(t), 0, len(q))
    raise SystemExit('QUOTE NOT FOUND in %s:\n  %s\n  longest common piece: %r' % (pid, q[:200], t[best.a:best.a + best.size][:200]))


def fmt_date(d):
    y, m, dd = d.split('-')
    return '%s %d, %s' % (MONTHS[int(m) - 1], int(dd), y)


_IMG = None


def image_manifest():
    global _IMG
    if _IMG is None:
        _IMG = {}
        p = os.path.join(calib.CA_DOCS, 'images.jsonl')
        if os.path.exists(p):
            for l in open(p, encoding='utf-8'):
                if l.strip():
                    d = json.loads(l)
                    _IMG[(d['page_id'], d['tag'])] = d
    return _IMG


# ---- text sharing (reprints): 4-word shingles of the quote found in other saved pages of the same days
_NORMS = {}


def alnum_tokens(s):
    return re.findall(r'[a-z0-9]+', s.lower())


def norm_page(pid):
    if pid not in _NORMS:
        _NORMS[pid] = ' ' + ' '.join(alnum_tokens(calib.norm(calib.page_text(pid), dehyphen=True))) + ' '
    return _NORMS[pid]


def shares(pid, quote, man, window_days=3):
    import datetime
    d0 = datetime.date.fromisoformat(man[pid]['date'])
    toks = alnum_tokens(quote)
    grams = [' '.join(toks[i:i + 4]) for i in range(0, max(0, len(toks) - 3))]
    grams = [g for g in grams if len(g) > 12]
    if len(grams) < 3:
        return []
    out = []
    for oid, om in man.items():
        if oid == pid or om['lccn'] == man[pid]['lccn'] and om['date'] == man[pid]['date']:
            continue
        if abs((datetime.date.fromisoformat(om['date']) - d0).days) > window_days:
            continue
        t = norm_page(oid)
        hit = sum(1 for g in grams if (' ' + g + ' ') in t)
        if hit / len(grams) >= 0.35:
            out.append({'page_id': oid, 'newspaper': (paper_display(om['lccn']) or om.get('paper') or '').split(' (')[0],
                        'issue_date': om['date'], 'shared_fraction': round(hit / len(grams), 2)})
    out.sort(key=lambda x: -x['shared_fraction'])
    return out


def citation(c, man):
    pid = c['page']
    m = man[pid]
    quote, variant, off = resolve_quote(c)
    v = views(pid)
    disp = paper_display(m['lccn']) or m['paper']
    mm = re.search(r'\((.*)\)\s*$', disp or '')
    place = mm.group(1) if mm else None
    for extra in ('dateline', 'attribution'):
        if c.get(extra) and calib.norm(c[extra]) not in v['plain'] and calib.norm(c[extra]) not in v['line-end hyphens joined']:
            raise SystemExit('%s NOT FOUND in %s: %s' % (extra, pid, c[extra][:120]))
    ctx_before = v[variant][max(0, off - 360):off]
    rep = c.get('reprint') or {'status': 'unknown', 'from': None, 'basis': 'the page text read names no source for the passage'}
    qc = rebuild_cols.quote_confidence(page_words(pid)[1], quote)
    distinct_wc = len({w[1] for w in page_words(pid)[1]})
    if c.get('img'):
        im = image_manifest().get((pid, c['img']))
        if not im:
            raise SystemExit('no image record %s %s' % (pid, c['img']))
        ocr = {'method': 'the page image region of the passage was viewed (image service crop) and compared with the saved text',
               'image_url': im['url'], 'image_sha256': im['sha256'], 'viewed': RETRIEVED,
               'reading': c.get('reading'), 'corrections': c.get('corrections') or []}
    else:
        ocr = {'method': 'none: the saved OCR text only; the print of this passage was not viewed', 'reading': None, 'corrections': []}
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
        'alto_url': m['alto_url'],
        'alto_sha256': m['alto_sha256'],
        'retrieved': RETRIEVED,
        'local_path': m['local_path'],
        'text_sha256': m['text_sha256'],
        'page_chars': m['chars'],
        'text_variant': 'column-ordered reading text rebuilt from the page ALTO file (%s: lines in column order, stray rule marks removed, nothing corrected); whitespace collapsed' % rebuild_cols.VERSION + ('' if variant == 'plain' else ', line-end hyphens joined'),
        'quote': quote,
        'quote_offset': off,
        'ocr_wc_mean': qc[0] if qc else None,
        'ocr_wc_min': qc[1] if qc else None,
        'ocr_wc_kind': 'per word (ALTO WC of each word of the quote)' if distinct_wc > 3 else 'page-level: every word of this page carries the same value, so it says nothing about this passage',
        'dateline': c.get('dateline'),
        'attribution': c.get('attribution'),
        'reprint': rep,
        'shares_text_with': shares(pid, quote, man),
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
    errors = []
    for c in claims:
        cites = []
        for x in c['cites']:
            try:
                cites.append(citation(x, man))
            except SystemExit as e:
                errors.append('[%s %s] %s' % (c['_module'], c['key'], e))
        if len(cites) != len(c['cites']):
            continue
        papers = sorted({x['lccn'] for x in cites})
        for tid in c['ids']:
            k = (tid, c['_module'], c['key'])
            if k in seen:
                raise SystemExit('duplicate claim key %s' % (k,))
            seen.add(k)
            is_timeline = bool(re.match(r'^(E|T\d)-\d+$', tid))
            line = {
                'id': tid,
                'shard': 'web-newspapers',
                'xid': 'NEWS-%s-%s' % (c['_module'].replace('claims_', ''), c['key']),
                'kind': 'epilogue row' if re.match(r'^E-\d+$', tid) else ('timeline row' if is_timeline else 'requirement item'),
                'sub_claim': c['sub_claim'],
                'tier': c['tier'],
                'verdict': c.get('verdict', 'partially_supported'),
                'state_date': c.get('state_date'),
                'citation': cites[0],
                'more_citations': cites[1:],
                'papers': len(papers),
                'independence': c.get('independence') or 'a count of papers is not a count of independent witnesses: see reprint and shares_text_with of each citation',
                'row_effect': c.get('row_effect'),
                'remains_unsupported': c.get('remains') or 'one contemporary newspaper report; the other papers, the underlying records and the non-newspaper sources were not read for this line',
            }
            for k2 in ('caution', 'conflict'):
                if c.get(k2):
                    line[k2] = c[k2]
            (lines_t if is_timeline else lines_e).append(line)
    if errors:
        print('\n'.join(errors))
        raise SystemExit('%d cite(s) failed; nothing written' % len(errors))
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
