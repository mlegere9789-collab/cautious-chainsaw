"""roster2/1: the compact tracked roster format (reader, writer, verifier).  Standard library only.

One file per unit:  rosters/data2/<army>/<state>/<unit>.jsonl.gz   (gzip, UTF-8, one JSON value per line)

  line 1          header object   {"f":"roster2/1","u":unit key,"army":"union"|"confederate","st":state code,
                                   "name":designation,"n":number of row lines}
  segment object  {"s":source id,"v":volume,"t":text id,"lay":"flow"|"cols"}   every row after it, up to the
                  next segment object, was read from that source text
  row array       [name, rank, co, remarks, page, off, rd]
                    name     name as printed: the OCR tokens of the source text joined by single blanks,
                             never corrected, never re-ordered
                    rank     rank as printed on the entry; "^Word" when it is carried from a section heading
                             above the entry (for example ^Privates); "" when none is printed
                    co       company code from the nearest heading above: A to M, FS (field and staff),
                             NCS, BAND, UNAS (unassigned or recruits), "" (not stated)
                    remarks  everything else the entry prints, OCR tokens joined by single blanks, in full
                    page     printed page number of the leaf (int, or text such as "xii"); null when the
                             page-number file gives none for that leaf
                    off      character offset of the first character of the name in the source text
                    rd       offset of the first character of the remarks minus off (0 when remarks is "")

No page images, no labels, no corrected names.  A row says only what the source line prints; whether a man
was at Gettysburg is stated only where the printed remark states it.

Source text ("text id"): one OCR text file kept under tmp/library/rosters/<source id>/ and pinned by sha256 in
rosters/data2/sources/<source id>.json.  Kind "ia-hocr-searchtext": the Internet Archive file
<identifier>_hocr_searchtext.txt.gz (decompressed, decoded UTF-8 with newline='' so that an offset is a
character index), with <identifier>_hocr_pageindex.json.gz (character range of every leaf) and
<identifier>_page_numbers.json (printed page number of every leaf).

Verification of a row against its source text (verify_rows):
  V1 name      the name tokens stand in the text at off, in order, separated only by white space; off may
               point inside a text token (after OCR noise) and the last name token may be followed by
               punctuation in the text
  V2 remarks   the remark tokens stand in the text in order from off+rd; between two tokens at most GAP
               characters of other text may be stepped over (running heads at a page break; other columns
               of a table when lay is "cols"); rows that needed it are counted
  V3 page      off lies inside a leaf of the page index and the printed page number of that leaf is the
               row's page
  V4 rank      the rank tokens occur in the same leaf (or, for a carried ^rank, anywhere before off)
A row that fails V1 or V3 is a defect: it is not locatable and must not be published.
"""
import gzip, io, json, os, re, hashlib, bisect

FORMAT = 'roster2/1'
GAP = {'flow': 200, 'cols': 600}
CO_CODES_NOTE = 'A-M company letter; FS field and staff; NCS non-commissioned staff; BAND; UNAS unassigned or recruits; "" not stated'
GETTYSBURG_RE = re.compile(r'G[eo][it]{1,3}[yvj]s?[- ]?\s?b[uvn][ri][gqy]h?', re.I)   # OCR-tolerant, used for counts only


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def norm_ws(s):
    return ' '.join(s.split())


def load_text(path):
    """Source text as one str; offsets are character indices (no newline translation)."""
    if path.endswith('.gz'):
        with gzip.open(path, 'rb') as f:
            return f.read().decode('utf-8')
    with open(path, 'rb') as f:
        return f.read().decode('utf-8')


class PageMap:
    """Leaf and printed page of a character offset (Internet Archive page index and page numbers)."""

    def __init__(self, pageindex_path=None, page_numbers_path=None, ranges=None, numbers=None):
        if ranges is None:
            with gzip.open(pageindex_path, 'rb') as f:
                ranges = [(r[0], r[1]) for r in json.loads(f.read().decode('utf-8'))]
        self.ranges = ranges
        self.starts = [r[0] for r in ranges]
        self.numbers = {}
        self.confidence = None
        if numbers is not None:
            self.numbers = numbers
        elif page_numbers_path and os.path.exists(page_numbers_path):
            d = json.load(open(page_numbers_path, encoding='utf-8'))
            self.confidence = d.get('confidence')
            for p in d.get('pages', []):
                self.numbers[int(p['leafNum'])] = p.get('pageNumber') or ''

    def leaf(self, off):
        i = bisect.bisect_right(self.starts, off) - 1
        while i >= 0 and self.ranges[i][0] == self.ranges[i][1]:   # empty leaves share a start offset
            i -= 1
        if i < 0 or off >= self.ranges[i][1]:
            return None
        return i

    def printed(self, leaf):
        """Printed page as stored in a row: int when numeric, str otherwise, None when not given."""
        s = self.numbers.get(leaf, '')
        if s == '' or s is None:
            return None
        return int(s) if re.fullmatch(r'[0-9]+', s) else s

    def span(self, leaf):
        return self.ranges[leaf]


# ------------------------------------------------------------------ writer

def row(name, rank, co, remarks, page, off, rd):
    name, rank, remarks = norm_ws(name), norm_ws(rank), norm_ws(remarks)
    if not name:
        raise ValueError('a row needs a printed name')
    if not isinstance(off, int) or off < 0:
        raise ValueError('off must be a character offset')
    return [name, rank, co, remarks, page, off, int(rd) if remarks else 0]


def dumps_line(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


def write_unit(path, unit_key, army, st, name, segments):
    """segments: list of (segment dict with s, v, t, lay; list of rows).  Deterministic bytes."""
    n = sum(len(rows) for _, rows in segments)
    out = [dumps_line({'f': FORMAT, 'u': unit_key, 'army': army, 'st': st, 'name': name, 'n': n})]
    for seg, rows in segments:
        if seg.get('lay') not in GAP:
            raise ValueError('segment lay must be flow or cols')
        out.append(dumps_line({'s': seg['s'], 'v': str(seg['v']), 't': seg['t'], 'lay': seg['lay']}))
        out.extend(dumps_line(r) for r in rows)
    raw = ('\n'.join(out) + '\n').encode('utf-8')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'wb') as f:
        with gzip.GzipFile(filename='', mode='wb', fileobj=f, compresslevel=9, mtime=0) as g:
            g.write(raw)
    os.replace(tmp, path)
    return {'n': n, 'raw': len(raw), 'gz': os.path.getsize(path), 'sha256': hashlib.sha256(raw).hexdigest()}


# ------------------------------------------------------------------ reader

def read_unit(path):
    """Returns (header, [(segment, rows)]).  Raises ValueError on any shape defect."""
    with gzip.open(path, 'rb') as f:
        raw = f.read()
    lines = raw.decode('utf-8').split('\n')
    if lines[-1] != '':
        raise ValueError('file must end with a newline')
    lines.pop()
    head = json.loads(lines[0])
    if not isinstance(head, dict) or head.get('f') != FORMAT:
        raise ValueError('line 1 is not a %s header' % FORMAT)
    segs = []
    for ln, s in enumerate(lines[1:], 2):
        v = json.loads(s)
        if isinstance(v, dict):
            if not all(k in v for k in ('s', 'v', 't', 'lay')):
                raise ValueError('line %d: segment needs s, v, t, lay' % ln)
            segs.append((v, []))
        elif isinstance(v, list):
            if not segs:
                raise ValueError('line %d: row before any segment' % ln)
            if len(v) != 7 or not all(isinstance(v[i], str) for i in (0, 1, 2, 3)) \
                    or not (v[4] is None or isinstance(v[4], (int, str))) \
                    or not isinstance(v[5], int) or not isinstance(v[6], int) or not v[0]:
                raise ValueError('line %d: row shape' % ln)
            segs[-1][1].append(v)
        else:
            raise ValueError('line %d: not an object or array' % ln)
    n = sum(len(r) for _, r in segs)
    if head.get('n') != n:
        raise ValueError('header n=%r but %d rows' % (head.get('n'), n))
    return head, segs, {'raw': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


# ------------------------------------------------------------------ verifier

_tok = re.compile(r'\S+')


def _match_tokens(text, pos, tokens, gap):
    """Tokens in order from pos.  The first token must stand exactly at pos (pos may point inside a text
    token); every following token must be the next text token, the last one may be followed by glued
    punctuation; with gap > 0 other text tokens may be stepped over while they begin no more than gap
    characters after the previous matched token.  Returns (end offset, number of steps over) or None."""
    n = len(text)
    if not tokens:
        return pos, 0
    tok = tokens[0]
    if pos < 0 or text[pos:pos + len(tok)] != tok:
        return None
    p = pos + len(tok)
    used = 0
    for k in range(1, len(tokens)):
        tok = tokens[k]
        last = k == len(tokens) - 1
        while p < n and not text[p].isspace():      # rest of the text token just matched (glued punctuation)
            p += 1
        anchor = p
        stepped = False
        while True:
            m = _tok.search(text, p)
            if not m:
                return None
            w = m.group(0)
            if w == tok or (last and w.startswith(tok)):
                p = m.start() + len(tok)
                break
            if m.start() - anchor > gap or gap == 0:
                return None
            stepped = True
            p = m.end()
        if stepped:
            used += 1
    return p, used


def verify_rows(segments, texts, pagemaps, max_report=20):
    """texts: {text id: str}; pagemaps: {text id: PageMap}.  Returns a statistics dict with defect samples."""
    st = {'rows': 0, 'name_ok': 0, 'remark_ok': 0, 'remark_gap_rows': 0, 'remark_empty': 0, 'page_ok': 0,
          'page_null': 0, 'rank_ok': 0, 'rank_empty': 0, 'order_breaks': 0, 'defects': []}

    def bad(kind, seg, r):
        if len(st['defects']) < max_report:
            st['defects'].append({'kind': kind, 't': seg['t'], 'off': r[5], 'name': r[0]})

    for seg, rows in segments:
        text, pm = texts[seg['t']], pagemaps.get(seg['t'])
        gap = GAP[seg['lay']]
        last = -1
        for r in rows:
            st['rows'] += 1
            name, rank, co, rem, page, off, rd = r
            if off < last:
                st['order_breaks'] += 1
            last = off
            m = _match_tokens(text, off, name.split(), 0)
            if m:
                st['name_ok'] += 1
            else:
                bad('name-not-at-offset', seg, r)
            if rem:
                m2 = _match_tokens(text, off + rd, rem.split(), gap)
                if m2:
                    st['remark_ok'] += 1
                    if m2[1]:
                        st['remark_gap_rows'] += 1
                else:
                    bad('remark-not-at-offset', seg, r)
            else:
                st['remark_empty'] += 1
            leaf = pm.leaf(off) if pm else None
            if pm is not None and leaf is not None and pm.printed(leaf) == page:
                st['page_ok'] += 1
                if page is None:
                    st['page_null'] += 1
            else:
                bad('page-mismatch', seg, r)
            if not rank:
                st['rank_empty'] += 1
            else:
                if rank.startswith('^'):
                    hay = text[max(0, off - 400000):off]
                    toks = rank[1:].split()
                elif leaf is not None:
                    a, b = pm.span(leaf)
                    hay, toks = text[a:b], rank.split()
                else:
                    hay, toks = '', rank.split()
                if all(t in hay for t in toks):
                    st['rank_ok'] += 1
                else:
                    bad('rank-not-in-leaf', seg, r)
    return st


def gettysburg_rows(segments):
    return sum(1 for _, rows in segments for r in rows if GETTYSBURG_RE.search(r[3]))
