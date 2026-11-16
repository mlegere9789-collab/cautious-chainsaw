"""extracts: the one shared function that re-matches a source extract in the stored source text (GATE-SPEC 5, K5, U-09, T-Q02-1).

"Documented" is only a stored flag until a runner has found the extract again in the text on this machine (GATE-SPEC K5). This module gives:

* fold(s)        the tolerant form used to compare (case, punctuation, quotation marks, dashes, end-of-line hyphenation and white space folded; digits kept)
* numbers(s)     the numeric tokens of a claim (every number of the claim has to stand inside the span, p. 126, D.4.3 stage 11)
* quote_ok(q)    the length rule: at most 14 words (the plan says under 15 words, p. 134, E.6; T-Q02-1)
* TextStore      where the stored texts of the sources are: the acquisition ledgers (`library/acquired*.json`, `local_path`), the Official Records
                 (tools/bt/or27_find.py, report ids and printed pages) and the state volumes (tools/bt/statevol_find.py). A text that is not on the machine
                 gives status `no_text` (the caller records NOT-RUN for the extract and never a pass).

Nothing here reads the network or writes a file.
"""
import json
import os
import re
import sys
import unicodedata

from pq_common import MAX_QUOTE_WORDS

_QUOTES = {ord(c): "'" for c in '‘’‛′`´'}
_DQUOTES = {ord(c): '"' for c in '“”„″'}
_DASHES = {ord(c): '-' for c in '‐‑‒–—―−'}
_NONALNUM = re.compile(r'[^0-9a-z]+')
_NUM = re.compile(r'(?<![0-9A-Za-z])[0-9][0-9,]*(?:\.[0-9]+)?(?![0-9A-Za-z])|(?<=[A-Za-z])[0-9]+(?![0-9A-Za-z])')
_NUM_ONLY = re.compile(r'[0-9]+(?:\.[0-9]+)?')


def fold(s):
    """Fold a text for comparison: NFKC, lower case, quotation marks and dashes plain, hyphenation at a line end joined, everything that is not a letter or digit one space."""
    s = unicodedata.normalize('NFKC', str(s or ''))
    s = s.translate(_QUOTES).translate(_DQUOTES).translate(_DASHES).replace('­', '')
    s = re.sub(r'-[ \t]*\r?\n[ \t]*(?=[a-z])', '', s)          # "con-\nversation" -> "conversation"
    s = s.lower()
    s = _NONALNUM.sub(' ', s)
    return s.strip()


def numbers(s):
    """The numbers a claim states, as plain digit strings ('1,200' -> '1200'; '3.5' stays '3.5'); words such as 'three' are not numbers here."""
    out = []
    for m in re.finditer(r'(?<![A-Za-z0-9])\d[\d,]*(?:\.\d+)?', unicodedata.normalize('NFKC', str(s or ''))):
        t = m.group(0).rstrip(',').replace(',', '')
        if t:
            out.append(t)
    return out


_ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
_TENS = {2: 'twenty', 3: 'thirty', 4: 'forty', 5: 'fifty', 6: 'sixty', 7: 'seventy', 8: 'eighty', 9: 'ninety'}
_ORD = 'zeroth first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth thirteenth fourteenth fifteenth sixteenth seventeenth eighteenth nineteenth twentieth'.split()


_ORD_LAST = {'one': 'first', 'two': 'second', 'three': 'third', 'five': 'fifth', 'eight': 'eighth', 'nine': 'ninth', 'twelve': 'twelfth'}


def _card(v):
    if v < 20:
        return _ONES[v]
    if v < 100:
        return _TENS[v // 10] + ('' if v % 10 == 0 else ' ' + _ONES[v % 10])
    return _ONES[v // 100] + ' hundred' + ('' if v % 100 == 0 else ' and ' + _card(v % 100))


def _ordinal(card):
    head, _, last = card.rpartition(' ')
    if last in _ORD_LAST:
        o = _ORD_LAST[last]
    elif last.endswith('y'):
        o = last[:-1] + 'ieth'
    else:
        o = last + 'th'
    return (head + ' ' + o).strip()


def number_variants(n):
    """The folded English words for a whole number 0..999: cardinal and ordinal, with and without 'and' ('one hundred and twenty five', 'forty sixth', 'fiftieth'). Empty for other numbers."""
    if not re.fullmatch(r'\d{1,3}', n):
        return set()
    v = int(n)
    c = _card(v)
    out = {c, _ordinal(c)}
    for x in list(out):
        out.add(x.replace(' and ', ' '))
    return out


def number_words(n):
    """English cardinal words of a whole number 0..999 as the folded text writes them, or None."""
    return _card(int(n)) if re.fullmatch(r'\d{1,3}', n) else None


def strip_subject(text, unit_id):
    """The unit that a claim is about is its subject, not part of what it states: an ordinal such as '24th' that is the regiment number of the unit id is not counted."""
    if not text or not unit_id:
        return text
    runs = set(re.findall(r'\d+', unit_id))
    return re.sub(r'\b(\d+)(?:st|nd|rd|th|d)\b', lambda m: '' if m.group(1) in runs else m.group(0), text)


def numbers_in_span(claim, span):
    """Every number of `claim` stands in `span` (as a whole token after folding). Returns (ok, missing). A fraction written 3/4 is satisfied by a fraction word (quarter, half, third) or the same fraction."""
    sp = ' ' + _NONALNUM.sub(' ', unicodedata.normalize('NFKC', str(span or '')).lower().replace(',', '')) + ' '
    sp = re.sub(r'(?<=[a-z]) (?=(?:one|two|three|four|five|six|seven|eight|nine)\b)', ' ', sp)
    claim = str(claim or '')
    fr = re.findall(r'\d+\s*/\s*\d+', claim)
    if fr:
        claim = re.sub(r'\d+\s*/\s*\d+', ' ', claim)
    missing = []
    for f in fr:
        if not (re.search(r'\b(quarter|quarters|half|halves|third|thirds|fifth|fifths|eighth)\b', sp) or f.replace(' ', '') in str(span or '').replace(' ', '')):
            missing.append(f.replace(' ', ''))
    for n in dict.fromkeys(numbers(claim)):
        ords = [' ' + n + suf + ' ' for suf in ('st', 'nd', 'rd', 'th', 'd')] + [' ' + w + ' ' for w in number_variants(n)]
        if (' ' + n.replace('.', ' ') + ' ') in sp or (' ' + n + ' ') in sp or any(o in sp for o in ords):
            continue
        missing.append(n)
    return (not missing), missing


def quote_words(q):
    return len(str(q or '').split())


def quote_ok(q):
    """True when the extract is present and shorter than 15 words (T-Q02-1: at most 14)."""
    w = quote_words(q)
    return 1 <= w <= MAX_QUOTE_WORDS


class FoldedText:
    __slots__ = ('path', 'text', 'sha256_hint')

    def __init__(self, path, raw):
        self.path = path
        self.text = ' ' + fold(raw) + ' '

    def find(self, quote):
        q = fold(quote)
        if not q:
            return -1
        return self.text.find(' ' + q + ' ')


class TextStore:
    """Resolve a source id to its stored text and find an extract in it. `env` is pq_common.Env; `ledgers` the parsed acquisition ledgers (optional)."""

    def __init__(self, env, ledgers=None):
        self.env = env
        self._paths = {}
        self._cache = {}
        self._or27 = None
        self._used = set()
        self._sv = None
        self._or27_err = None
        self._sv_err = None
        for led, key, idk in (('acquired.json', 'items', 'source_id'), ('acquired_2.json', 'items', 'id'), ('acquired_3.json', 'items', 'id')):
            fn = os.path.join(env.gov, 'library', led)
            if ledgers is not None:
                items = (ledgers.get(led) or {}).get(key) or []
            elif os.path.isfile(fn):
                try:
                    with open(fn, encoding='utf-8') as f:
                        items = json.load(f).get(key) or []
                except (OSError, ValueError):
                    items = []
            else:
                items = []
            for it in items:
                lp = it.get('local_path')
                sid = it.get(idk)
                if sid and lp:
                    self._paths[sid] = os.path.join(env.root, *lp.split('/'))

    # --------------------------------------------------------------- generic texts
    def path_of(self, source_id):
        return self._paths.get(source_id)

    def has_text(self, source_id):
        p = self._paths.get(source_id)
        return bool(p and os.path.isfile(p))

    def text(self, source_id):
        p = self._paths.get(source_id)
        if not p or not os.path.isfile(p):
            return None
        if source_id not in self._cache:
            with open(p, encoding='utf-8', errors='replace', newline='') as f:
                self._cache[source_id] = FoldedText(p, f.read())
        return self._cache[source_id]

    def find(self, source_id, quote):
        """{'status': 'found' | 'not_found' | 'no_text' | 'no_source' | 'bad_quote', ...}"""
        if not source_id:
            return {'status': 'no_source'}
        if not quote_ok(quote):
            return {'status': 'bad_quote', 'words': quote_words(quote)}
        ft = self.text(source_id)
        if ft is None:
            return {'status': 'no_text', 'source': source_id}
        self._used.add(ft.path)
        i = ft.find(quote)
        r = {'status': 'found' if i >= 0 else 'not_found', 'source': source_id, 'offset': i if i >= 0 else None}
        if i >= 0:
            r['span_text'] = ft.text[max(0, i - 250): i + len(fold(quote)) + 250]       # the span of a text without sentence marks: 250 folded characters either side
        return r

    # --------------------------------------------------------------- Official Records (report id, printed page)
    def _load_or27(self):
        if self._or27 is None and self._or27_err is None:
            try:
                sys.path.insert(0, self.env.tools)
                import or27_find  # noqa: PLC0415
                self._or27 = or27_find
                for p in (1, 2, 3):
                    or27_find.get_part(p)
            except Exception as e:                      # texts not on the machine, or the module is absent
                self._or27_err = '%s: %s' % (type(e).__name__, str(e)[:160])
        return self._or27

    def find_or27(self, quote, report_id=None, printed_page=None):
        """Find the extract in the Official Records vol. 27 (tools/bt/or27_find.verify, case-sensitive on the normalized view). Status found only when a hit lies in `report_id`
        (when given); `page_ok` says whether the printed page agrees (a page marked with '~' is interpolated and agrees when the cited page lies in its range)."""
        if not quote_ok(quote):
            return {'status': 'bad_quote', 'words': quote_words(quote)}
        m = self._load_or27()
        if m is None:
            return {'status': 'no_text', 'reason': 'Official Records text or index not on this machine (%s)' % self._or27_err}
        mm = re.match(r'^OR27-(\d)-R\d+', str(report_id or ''))
        parts = (int(mm.group(1)),) if mm and int(mm.group(1)) in (1, 2, 3) else (1, 2, 3)      # the report id names the part of the volume it is in
        key = (fold(quote), parts, report_id, str(printed_page))
        cache = self.__dict__.setdefault('_or27_cache', {})
        if key in cache:
            return cache[key]
        for part in parts:
            try:
                self._used.add(m.raw_path(part) if hasattr(m, 'raw_path') else m.get_part(part).path)
            except Exception:
                pass
        r = self._find_or27(m, quote, report_id, printed_page, parts)
        cache[key] = r
        return r

    def _find_or27(self, m, quote, report_id, printed_page, parts):
        hits = m.verify(quote, parts=parts)
        recs = sorted({h['record'] for h in hits if h.get('record')})
        if report_id and report_id not in recs:
            return {'status': 'not_found', 'records': recs[:6], 'hits': len(hits)}
        if not hits:
            return {'status': 'not_found', 'records': [], 'hits': 0}
        span = None
        try:
            sel = [h for h in hits if (not report_id or h.get('record') == report_id)]
            if sel:
                h = sel[0]
                span = self._sentence(m.get_part(h['part']).text, h['start'], h['end'])
        except Exception:
            span = None
        page_ok = None
        if printed_page not in (None, ''):
            pages = [h['page'] for h in hits if (not report_id or h.get('record') == report_id)]
            page_ok = any(self._page_agrees(p, printed_page) for p in pages)
        return {'status': 'found', 'records': recs[:6], 'hits': len(hits), 'page_ok': page_ok, 'span_text': span}

    _ABBR = re.compile(r'(?:\b(?:Maj|Gen|Col|Lieut|Lt|Capt|Brig|Mr|Dr|St|No|Co|Gov|Sergt|Corp|Surg|Asst|Adjt|Mrs|Hon|vs|Pa|Va|Md|Mass|Penn|Cav|Inf|Art|Div|Corps|Brigr|Cos|Regt|Vols|Rept|Rep|etc|viz|inst|ult|prox)|\b[A-Za-z]|\b[ap]\. ?m)\.$')

    @staticmethod
    def _boundaries(text):
        """Offsets just after a sentence end: a period, question or exclamation mark followed by space and a capital letter, unless the word before the period is an abbreviation or an initial."""
        out = []
        for m in re.finditer(r'[.?!]["\u201d\')]?\s+(?=[A-Z0-9])', text):
            before = text[max(0, m.start() - 12):m.start() + 1]
            if m.group(0)[0] == '.' and TextStore._ABBR.search(before):
                continue
            out.append(m.end())
        return out

    @staticmethod
    def _sentence(text, a, b, reach=900):
        """The sentence of the original text that holds [a, b): between the sentence ends around it, at most `reach` characters either side."""
        lo, hi = max(0, a - reach), min(len(text), b + reach)
        seg = text[lo:hi]
        bs = TextStore._boundaries(seg)
        pa, pb = a - lo, b - lo
        start = max([x for x in bs if x <= pa] or [0])
        end = min([x for x in bs if x >= pb] or [len(seg)])
        return seg[start:end]

    @staticmethod
    def _page_range(x):
        s = str(x).strip()
        m = re.match(r'^~?(\d+)\s*\((\d+)-(\d+)\)$', s)
        if m:
            return int(m.group(2)), int(m.group(3))
        m = re.match(r'^~?(\d+)\s*-\s*~?(\d+)$', s)
        if m:
            return int(m.group(1)), int(m.group(2))
        m = re.match(r'^~?(\d+)$', s)
        if m:
            return int(m.group(1)), int(m.group(1))
        return None

    @staticmethod
    def _page_agrees(found, cited):
        """The printed page the text gives and the page the datum cites agree when their ranges overlap (a '~' page is interpolated inside a run of pages whose running heads the OCR lost)."""
        a, b = TextStore._page_range(found), TextStore._page_range(cited)
        if a is None or b is None:
            return True          # a page that cannot be read as a number is not a disagreement
        return a[0] <= b[1] and b[0] <= a[1]

    # --------------------------------------------------------------- state volumes
    def _load_sv(self):
        if self._sv is None and self._sv_err is None:
            try:
                sys.path.insert(0, self.env.tools)
                import statevol_find  # noqa: PLC0415
                idx = statevol_find.index()
                self._sv = (statevol_find, idx)
            except Exception as e:
                self._sv_err = '%s: %s' % (type(e).__name__, str(e)[:160])
        return self._sv

    def find_statevol(self, quote, volume=None, section=None):
        if not quote_ok(quote):
            return {'status': 'bad_quote', 'words': quote_words(quote)}
        sv = self._load_sv()
        if sv is None:
            return {'status': 'no_text', 'reason': 'state volume texts or index not on this machine (%s)' % self._sv_err}
        mod, idx = sv
        try:
            import re as _re
            q0 = mod.fold(mod.norm_query(quote))
            J = lambda m: m.group(1) + m.group(2)
            H = lambda m: m.group(1) + '-' + m.group(2)
            cands = [q0, _re.sub(r'(\w)- (\w)', J, q0), _re.sub(r'(\w)-(\w)', J, q0), _re.sub(r'(\w)- (\w)', H, q0)]
            secs = []
            keys = [volume] if volume else list(mod.SI.VOLUMES)
            for key in keys:
                V = self._sv_vol(mod, idx, key)
                if V is None:
                    continue
                try:
                    self._used.add(os.path.join(mod.SI.RAW_DIR, mod.SI.VOLUMES[key]['file'] + '_djvu.txt'))
                except Exception:
                    pass
                for cq in cands:
                    p = V.ntext.find(cq)
                    if p >= 0:
                        while p >= 0 and len(secs) < 40:
                            sec, page, interp, cite = V.cite(V.orig(p))
                            secs.append((key, sec['id'] if sec else None, page))
                            p = V.ntext.find(cq, p + 1)
                        break
        except Exception as e:
            return {'status': 'no_text', 'reason': 'state volume search failed: %s' % str(e)[:120]}
        if not secs:
            return {'status': 'not_found'}
        ids = sorted({s[1] for s in secs if s[1]})
        if section and section not in ids:
            return {'status': 'not_found', 'sections': ids[:6]}
        return {'status': 'found', 'sections': ids[:6], 'pages': sorted({str(s[2]) for s in secs})[:6]}

    def _sv_vol(self, mod, idx, key):
        cache = self.__dict__.setdefault('_sv_vols', {})
        if key not in cache:
            try:
                cache[key] = mod.Vol(key, idx)
            except Exception:
                cache[key] = None
        return cache[key]

    def used_inputs(self):
        """The stored text files that the run read (to be hashed as inputs of the record)."""
        return sorted(self._used)

    def status(self):
        return {'or27_error': self._or27_err, 'statevol_error': self._sv_err, 'texts_listed': len(self._paths), 'texts_read': len(self._used)}
