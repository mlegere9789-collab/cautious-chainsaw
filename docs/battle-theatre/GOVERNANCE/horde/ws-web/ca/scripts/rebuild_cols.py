#!/usr/bin/env python3
"""Rebuild column-ordered reading text from an ALTO file (Library of Congress OCR of an 1863 newspaper page).

RULES (version 1; the same rules produce every reading text of this task):
 1. The OCR text lines are kept exactly as the OCR gives them. Words are the CONTENT of the ALTO String elements.
 2. Only the ORDER changes: on a newspaper page the OCR layout analysis interleaves neighbouring columns
    line by line. Column left edges are found from the page's own histogram of line start positions; a line is
    assigned to the last column start that is not more than 12 percent of a column width to its right; lines are
    read top to bottom inside a column, columns left to right. A headline line that runs across a gutter stays
    in the column where it starts.
 3. The only characters removed are the stray vertical-rule marks (| and the broken bar) that the OCR reads from
    column rules: a word that consists only of such marks is dropped, such marks at the start or end of a word are cut.
 4. Nothing is corrected, merged or added. Line ends are kept (a word split by a hyphen at a line end stays
    split in the file; the matcher can join it when the citation says so).

As a module: rebuild(alto_path) -> (text, words, info); words = list of (token, wc, last_on_line, line_no, (x, y, w, h)).
As a script:  rebuild_cols.py ALTO.xml > out.txt
"""
import collections, gzip, re, sys
import xml.etree.ElementTree as ET

NS = '{http://www.loc.gov/standards/alto/ns-v3#}'
VERSION = 'rebuild_cols v1'
RULEMARKS = '|¦'


def _open(path):
    return gzip.open(path, 'rb') if path.endswith('.gz') else open(path, 'rb')


def _local(tag):
    return tag.rsplit('}', 1)[-1]


def read_lines(path):
    """Namespace-agnostic (the 2024 re-OCR is ALTO v3, the older NDNP files are ALTO v2)."""
    with _open(path) as f:
        root = ET.parse(f).getroot()
    page = None
    for el in root.iter():
        if _local(el.tag) == 'Page':
            page = el
            break
    W = int(float(page.get('WIDTH')))
    H = int(float(page.get('HEIGHT')))
    lines = []
    for tl in root.iter():
        if _local(tl.tag) != 'TextLine':
            continue
        words = []
        for s in tl:
            if _local(s.tag) != 'String':
                continue
            c = (s.get('CONTENT') or '').strip(RULEMARKS + ' ')
            if not c:
                continue
            try:
                wc = float(s.get('WC')) if s.get('WC') is not None else None
            except ValueError:
                wc = None
            try:
                geo = (int(float(s.get('HPOS'))), int(float(s.get('VPOS'))), int(float(s.get('WIDTH'))), int(float(s.get('HEIGHT'))))
            except (TypeError, ValueError):
                geo = (0, 0, 0, 0)
            words.append((c, wc, geo))
        if not words:
            continue
        lines.append({'x': int(float(tl.get('HPOS'))), 'y': int(float(tl.get('VPOS'))), 'w': int(float(tl.get('WIDTH'))),
                      'h': int(float(tl.get('HEIGHT'))), 'words': words})
    return W, H, lines


def column_starts(W, lines):
    col_w_guess = W / 6.0
    narrow = [l for l in lines if col_w_guess * 0.35 < l['w'] < col_w_guess * 1.35]
    if len(narrow) < 20:
        narrow = lines
    bins = collections.Counter((l['x'] // 100) for l in narrow)
    if not bins:
        return [0]
    top = max(bins.values())
    peaks = []
    for b in sorted(bins):
        c = bins[b]
        if c >= max(6, 0.06 * top) and c >= bins.get(b - 1, 0) and c >= bins.get(b + 1, 0):
            peaks.append(b * 100)
    merged = []

    def weight(q):
        return sum(c for b, c in bins.items() if abs(b * 100 - q) <= 300)
    for p in peaks:
        if merged and p - merged[-1] < col_w_guess * 0.55:
            if weight(p) > weight(merged[-1]):
                merged[-1] = p
        else:
            merged.append(p)
    return merged or [0]


def rebuild(path):
    W, H, lines = read_lines(path)
    starts = column_starts(W, lines)
    tol = int(W / 6.0 * 0.12)
    cols = collections.defaultdict(list)
    for l in lines:
        idx = 0
        for i, s in enumerate(starts):
            if s <= l['x'] + tol:
                idx = i
        cols[idx].append(l)
    out = []
    words = []
    line_no = 0
    for i in range(len(starts)):
        ls = sorted(cols.get(i, []), key=lambda l: (l['y'], l['x']))
        out.append('=== COLUMN %d ===' % (i + 1))
        for l in ls:
            out.append(' '.join(w[0] for w in l['words']))
            line_no += 1
            for k, (w, wc, geo) in enumerate(l['words']):
                words.append((w, wc, k == len(l['words']) - 1, line_no, geo))
    info = {'rules': VERSION, 'width': W, 'height': H, 'lines': len(lines), 'columns': len(starts), 'starts': starts}
    return '\n'.join(out) + '\n', words, info


def quote_confidence(words, quote):
    """Locate the quote (whitespace tokens, line-end hyphen joins allowed) in the word list and return
    (mean_wc, min_wc, n_tokens) or None. wc values missing count as 0."""
    qt = quote.split()
    if not qt:
        return None
    # token streams: plain and with hyphen-joined pieces
    for join in (False, True):
        toks, wcs = [], []
        i = 0
        while i < len(words):
            w, wc, eol, ln = words[i][:4]
            if join and eol and w.endswith('-') and i + 1 < len(words) and len(w) > 1:
                w2, wc2, eol2, ln2 = words[i + 1][:4]
                toks.append(w[:-1] + w2)
                wcs.append(min(wc if wc is not None else 0.0, wc2 if wc2 is not None else 0.0))
                i += 2
                continue
            toks.append(w)
            wcs.append(wc if wc is not None else 0.0)
            i += 1
        n = len(qt)
        first = qt[0]
        for s in range(len(toks) - n + 1):
            if toks[s] == first and toks[s:s + n] == qt:
                seg = wcs[s:s + n]
                return round(sum(seg) / n, 3), round(min(seg), 3), n
    return None


def quote_box(words, quote):
    """Bounding box (x0, y0, x1, y1) in ALTO units of the words of the quote, or None. Uses the plain token match only."""
    qt = quote.split()
    n = len(qt)
    if not n:
        return None
    toks = [w[0] for w in words]
    for s in range(len(toks) - n + 1):
        if toks[s:s + n] == qt:
            seg = words[s:s + n]
            x0 = min(g[4][0] for g in seg)
            y0 = min(g[4][1] for g in seg)
            x1 = max(g[4][0] + g[4][2] for g in seg)
            y1 = max(g[4][1] + g[4][3] for g in seg)
            return x0, y0, x1, y1
    return None


if __name__ == '__main__':
    t, w, info = rebuild(sys.argv[1])
    sys.stdout.write(t)
    sys.stderr.write(repr(info) + '\n')
