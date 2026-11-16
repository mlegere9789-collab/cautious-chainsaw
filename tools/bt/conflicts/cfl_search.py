"""Search the local texts of the ledger (SOURCES.md) and describe where a passage is: source id, part, character offset, page.

Two uses: (1) a researcher locates a passage and gets the fields of a citation (find_passage.py); (2) the dossier builder lists candidate passages for the
names, units, places and clock words of a conflict (build_dossiers.py). The offsets are character offsets into the file decoded as UTF-8 with newline=''
(the convention of tools/bt/or27_lib.py); the quote check of the validator uses the same convention.

A probe is a proximity search: an anchor word (any of several, matched case-insensitively as a literal) with every `near` regex matching in a window of
`window` characters around it. Literal anchors are found with str.find on the lower-cased raw text, so the scan of the whole library takes seconds, and the
offset reported is the exact offset of the anchor in the raw file. Words split by a hyphen at a line end are not found by an anchor: search again with
find_passage.py --regex, which reads the whitespace- and hyphenation-normalised view.
"""
import bisect
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L

_RAW = {}
_LOW = {}
_OR_IDX = None


def raw_text(relpath):
    if relpath not in _RAW:
        if len(_RAW) > 6:
            _RAW.clear()
            _LOW.clear()
        _RAW[relpath] = L.read_text(os.path.join(L.ROOT, relpath))
    return _RAW[relpath]


def low_text(relpath):
    if relpath not in _LOW:
        _LOW[relpath] = raw_text(relpath).lower()
    return _LOW[relpath]


def or_records(part):
    global _OR_IDX
    if _OR_IDX is None:
        d = L.load_json(os.path.join(L.BT, 'library', 'or27_index.json'))['records']
        _OR_IDX = {}
        for r in d:
            _OR_IDX.setdefault(r['part'], []).append(r)
        for p in _OR_IDX:
            _OR_IDX[p].sort(key=lambda r: r['start_offset'])
    return _OR_IDX.get(part, [])


def or_record_at(part, off):
    recs = or_records(part)
    starts = [r['start_offset'] for r in recs]
    i = bisect.bisect_right(starts, off) - 1
    if i >= 0 and off < recs[i]['end_offset']:
        return recs[i]
    return None


def or_who(r):
    if r is None:
        return 'unindexed region'
    if r['part'] == 3:
        return '%s %s%s' % (r['id'], (r.get('header_raw') or r.get('toc_text') or '')[:50], (', dated %s' % r['date_raw']) if r.get('date_raw') else '')
    return '%s %s %s%s' % (r['id'], r.get('rank') or '', r.get('author') or (r.get('toc_text') or '')[:40], (' (first dateline of the record: %s)' % r['date_text']) if r.get('date_text') else '')


def describe(row, path, off, length, part=None):
    """Where offset `off` of a ledger text is: {'part', 'page', 'page_basis', 'who'}. `row` is the ledger row, `path` the repository-relative text path."""
    model = (row.get('pages') or 'none').lower()
    out = {'part': part, 'page': None, 'page_basis': 'none', 'who': None}
    if model == 'or27':
        n = int(row['id'][-1])
        r = or_record_at(n, off)
        out['part'] = r['id'] if r else None
        out['who'] = or_who(r)
        try:
            import cfl_cite as C
            pg = C.or27_pages(n, off, off + max(1, length))
            leaf = [x for x in pg['scan_leaf'] if x is not None]
            out['page'] = str(leaf[0]) if leaf else None
            out['page_basis'] = 'scan_leaf' if leaf else 'running_head'
            if not leaf and pg['running_head'] and pg['running_head'][0][0] is not None:
                out['page'] = str(pg['running_head'][0][0])
            if leaf and len(set(leaf)) > 1:
                out['page'] = '%s-%s' % (leaf[0], leaf[-1])
        except Exception:
            pass
    elif model == 'markers':
        raw = raw_text(path)
        pg = None
        for m in re.finditer(r'^=== PAGE (\d+) ===\s*$', raw[:off + 1], re.M):
            pg = int(m.group(1))
        out['page'] = str(pg) if pg is not None else None
        out['page_basis'] = 'pdf_marker'
    else:
        out['page_basis'] = 'as_read'
    return out


def families_parts(ctx, sid):
    return ctx_list_texts(ctx, sid)


def ctx_list_texts(ctx, sid):
    return L.town().list_texts(ctx, sid)


def ledger_texts(ctx, classes=None, ids=None, with_families=False):
    """[(source id, part or None, path, ledger row)] of the ledger sources that have a local text (a family expands to its parts when with_families)."""
    out = []
    for sid, row in ctx.ledger().items():
        if sid == '__duplicates__':
            continue
        if classes and row.get('class') not in classes:
            continue
        if ids and sid not in ids:
            continue
        t = row.get('text', '')
        if not t or t in ('-', 'none'):
            continue
        if '{part}' in t:
            if with_families:
                for part, rel in ctx_list_texts(ctx, sid):
                    out.append((sid, part, rel, row))
            continue
        if os.path.exists(os.path.join(L.ROOT, t)):
            out.append((sid, None, t, row))
    return out


CLOCK = r"(?:\b\d{1,2}\s*[.:]\s*\d{2}\b|\b\d{1,2}\s*(?:a\.?\s?m|p\.?\s?m)\b|o'?\s?clock|\bnoon\b|\bmidnight\b|\bdaybreak\b|\bsunrise\b|\bsunset\b|\bdawn\b|\bdusk\b|\bday-?light\b)"


def collapse(s):
    s = re.sub(r'(?<=[A-Za-z])-[ \t]*\r?\n[ \t]*(?=[a-z])', '', s)
    return ' '.join(s.split())


def probe_hits(relpath, anchors, near, window=300, max_hits=8, flags=re.I, score_terms=None, collect=80, accept=None):
    """Hits of a proximity probe in one text: [{'off': raw offset of the anchor, 'snippet': collapsed text around it, 'score': n}]. Hits closer than `window` are merged.
    Up to `collect` hits are gathered in document order and the `max_hits` with the best score are returned (score: how many of `score_terms` stand in the window, plus 2
    when a clock expression stands within 100 characters of the anchor)."""
    low = low_text(relpath)
    raw = raw_text(relpath)
    rxs = [re.compile(n, flags) for n in near]
    clock = re.compile(CLOCK, re.I)
    terms = [t.lower() for t in (score_terms or [])]
    # whitespace in the OCR text is irregular (double spaces, line breaks): an anchor of several words matches across any run of white space.
    # The first word is found with str.find (fast) and the rest of the anchor is matched at that position.
    offs = []
    for a in anchors:
        words = a.lower().split()
        if not words:
            continue
        rest = re.compile(r'\s+'.join(re.escape(w) for w in words)) if len(words) > 1 else None
        i = low.find(words[0])
        while i >= 0:
            if rest is None or rest.match(low, i):
                offs.append(i)
            i = low.find(words[0], i + 1)
    offs = sorted(set(offs))
    out, last = [], -10 ** 9
    for o in offs:
        if o - last < window:
            continue
        if accept is not None and not accept(o):
            continue
        a0, b0 = max(0, o - window), min(len(raw), o + window)
        seg = collapse(raw[a0:b0])
        if all(r.search(seg) for r in rxs):
            k = len(collapse(raw[a0:o]))
            s0 = max(0, k - 100)
            near_txt = seg[max(0, k - 100):k + 160]
            sc = sum(1 for t in terms if t in seg.lower()) + (2 if clock.search(near_txt) else 0)
            out.append({'off': o, 'snippet': seg[s0:s0 + 220], 'score': sc})
            last = o
            if len(out) >= collect:
                break
    out.sort(key=lambda h: (-h['score'], h['off']))
    return out[:max_hits]


def regex_hits(relpath, pattern, ctxn=150, max_hits=25, flags=re.I):
    """Hits of a regex on the whitespace- and hyphenation-normalised view: [{'off': raw offset of the match start, 'match', 'context'}]."""
    sys.path.insert(0, os.path.join(L.ROOT, 'tools', 'bt'))
    import or27_lib as O
    raw = raw_text(relpath)
    key = ('nview', relpath)
    if key not in _RAW:
        _RAW[key] = O.build_nview(raw)
    nt, nm = _RAW[key]
    rx = re.compile(pattern, flags)
    out = []
    for m in rx.finditer(nt):
        if m.end() == m.start():
            continue
        a, b = max(0, m.start() - ctxn), min(len(nt), m.end() + ctxn)
        out.append({'off': int(nm[m.start()]), 'end': int(nm[m.end() - 1]) + 1, 'match': m.group(0), 'context': nt[a:b], 'at': (m.start() - a, m.end() - a)})
        if len(out) >= max_hits:
            break
    return out


def locate_quote(ctx, sid, quote, part=None):
    """Offsets of a quote in a ledger text, by the engine's rule (letters and digits only, case, punctuation, line breaks and hyphenation tolerant; `[...]` skips text).
    Returns [(start offset)] or [] and the repository-relative path."""
    T = L.town()
    path, why = T.resolve_text(ctx, sid, part)
    if path is None:
        return [], None, why
    raw, skel, omap, marks = ctx.text(path)
    return T.match_quote(skel, omap, quote), path, None


def locate_quote_spans(ctx, sid, quote, part=None, max_gap_alnum=900):
    """[(start, end)] character offsets of a quote in a ledger text (the end is the offset after the last character of the last fragment), by the rule of locate_quote."""
    T = L.town()
    path, why = T.resolve_text(ctx, sid, part)
    if path is None:
        return [], None, why
    raw, skel, omap, marks = ctx.text(path)
    frs = [T.quote_skeleton(f) for f in T.fragments(quote)]
    out = []
    if not frs:
        return out, path, None
    for i0 in T.find_all(skel, frs[0]):
        pos = i0 + len(frs[0])
        ok = True
        for fr in frs[1:]:
            j = skel.find(fr, pos, pos + max_gap_alnum + len(fr))
            if j < 0:
                ok = False
                break
            pos = j + len(fr)
        if ok:
            out.append((int(omap[i0]), int(omap[pos - 1]) + 1))
    return out, path, None
