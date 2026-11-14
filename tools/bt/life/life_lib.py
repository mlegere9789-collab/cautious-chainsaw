"""Shared helpers of the OA11 (soldier work and routine) evidence pass.

Paths, the source registry, tolerant text matching with a map back to the ORIGINAL character offsets, the theatre clock,
number words, the unit and clip registries.  Nothing here reads the network.  All offsets are CHARACTER offsets into the
raw file decoded as UTF-8 with newline='' (the convention of tools/bt/or27_lib.py and of the evidence_corrections files).

Run scripts that import this with `python3 -I`; the script inserts tools/bt and tools/bt/life itself.
"""
import os, re, sys, json, hashlib, bisect, unicodedata
from array import array

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
LIFE = os.path.join(BT, 'life')
EVID = os.path.join(LIFE, 'evidence')
LEADS = os.path.join(LIFE, 'leads')
TMP = os.path.join(ROOT, 'tmp', 'life')
for _p in (os.path.join(ROOT, 'tools', 'bt'), HERE):
    if _p not in sys.path:
        sys.path.insert(0, _p)

SOURCES_PATH = os.path.join(EVID, 'sources.json')
CONTRACT_PATH = os.path.join(EVID, 'contract.json')
GROUPS_PATH = os.path.join(EVID, 'groups.json')
POSES_PATH = os.path.join(EVID, 'poses.json')
UNITS_PATH = os.path.join(BT, 'history', 'units.json')
CLIPS_PATH = os.path.join(BT, 'app', 'data', 'anim3d', 'clips.json')
OR_INDEX_PATH = os.path.join(BT, 'library', 'or27_index.json')
STATEVOL_INDEX_PATH = os.path.join(BT, 'library', 'statevol_index.json')
WORKS_PATH = os.path.join(BT, 'structures', 'works_stages.json')


def utf8_stdout():
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def dump_json(path, obj, indent=1):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=indent, sort_keys=False)
        f.write('\n')


def read_jsonl(path):
    rows = []
    with open(path, encoding='utf-8') as f:
        for n, line in enumerate(f, 1):
            line = line.strip()
            if line:
                rows.append((n, line))
    return rows


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blk in iter(lambda: f.read(1 << 20), b''):
            h.update(blk)
    return h.hexdigest()


def read_text(path):
    with open(path, encoding='utf-8', errors='replace', newline='') as f:
        return f.read()


# ---------------------------------------------------------------- theatre clock (src/clock.mjs)
_MON_START = {6: 0, 7: 30, 8: 61, 9: 92, 10: 122, 11: 153}


def min_of(month, day, hh=0, mm=0):
    return (_MON_START[month] + day - 1) * 1440 + hh * 60 + mm


BATTLE_FROM = min_of(6, 26)          # scrubber 26 Jun - 14 Jul 1863 (src/clock.mjs BATTLE)
BATTLE_TO = min_of(7, 15)
EPILOGUE_FROM = min_of(11, 18)       # 18-19 Nov 1863
EPILOGUE_TO = min_of(11, 20)


def fmt_min(m):
    day = int(m // 1440)
    mod = m - day * 1440
    mon = 6
    for k in (11, 10, 9, 8, 7, 6):
        if day >= _MON_START[k]:
            mon = k
            break
    return '1863-%02d-%02d %02d:%02d' % (mon, day - _MON_START[mon] + 1, int(mod // 60), int(mod % 60))


def in_theatre(m):
    return (BATTLE_FROM <= m <= BATTLE_TO) or (EPILOGUE_FROM <= m <= EPILOGUE_TO)


# ---------------------------------------------------------------- registries
_units = None
_clips = None


def units():
    """dict id -> unit record of history/units.json"""
    global _units
    if _units is None:
        _units = {u['id']: u for u in load_json(UNITS_PATH)['units']}
    return _units


def clip_ids():
    global _clips
    if _clips is None:
        _clips = {c['id']: c for c in load_json(CLIPS_PATH)['clips']}
    return _clips


def work_ids():
    ws = load_json(WORKS_PATH)['works']
    return set(ws.keys())


def corps_of(unit_id):
    """Walk the parent chain of units.json up to a corps (or army-level) record; returns (corps_id or None)."""
    us = units()
    u = us.get(unit_id)
    seen = 0
    while u and seen < 12:
        if u.get('level') in ('corps',):
            return u['id']
        p = u.get('parent')
        u = us.get(p) if p else None
        seen += 1
    return None


# ---------------------------------------------------------------- text normalisation
_TOK = re.compile(r'\S+')

_TYPO = str.maketrans({
    '‘': "'", '’': "'", '‚': "'", '‛': "'", '′': "'", '`': "'",
    '“': '"', '”': '"', '„': '"', '″': '"',
    '‐': '-', '‑': '-', '‒': '-', '–': '-', '—': '-', '―': '-', '−': '-',
    ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', '­': '',
    'ſ': 's', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl', '…': '...',
})


def squash(s):
    """whitespace-collapsed query form (the or27_find norm_query)"""
    return ' '.join(s.split())


def typo(s):
    """Length-preserving typography and case normalisation (curly quotes, dashes, ligatures reduced to their first letter)."""
    out = []
    for ch in s:
        c = ch.translate(_TYPO) if ord(ch) > 127 else ch
        out.append(c[:1].lower() if c else ' ')
    return ''.join(out)


# OCR confusion classes (digit/letter swaps listed in docs/battle-theatre/library/OR27-NOTES.md)
_FOLD_MAP = {}
for _cls, _chars in (('l', 'l1i|!/'), ('o', 'o0'), ('s', 's5$'), ('g', 'g6'), ('b', 'b8'), ('z', 'z23'), ('e', 'e'), ('c', 'c'),
                     ('u', 'uv'), ('t', 'tf'), ('h', 'h'), ('r', 'r'), ('n', 'n'), ('m', 'm'), ('a', 'a'), ('d', 'd'),
                     ('q', 'q9'), ('y', 'y'), ('w', 'w'), ('k', 'k'), ('p', 'p'), ('x', 'x'), ('j', 'j'), ('7', '7'), ('4', '4')):
    for _c in _chars:
        _FOLD_MAP[_c] = _cls


def fold_char(c):
    return _FOLD_MAP.get(c, c)


def build_view(text, blank_spans=None, dehyphen=True):
    """Whitespace-collapsed, line-break-dehyphenated view and a map back to ORIGINAL offsets (the or27_lib algorithm)."""
    out = []
    nmap = array('i')
    spans = blank_spans or []
    bs = [s for s, e in spans]
    be = [e for s, e in spans]
    pending = False
    for m in _TOK.finditer(text):
        s, e = m.span()
        if spans:
            i = bisect.bisect_right(bs, s) - 1
            if i >= 0 and s < be[i]:
                continue
        tok = m.group()
        if pending:
            if tok[0].islower():
                out.pop()
                nmap.pop()
            else:
                out.append(' ')
                nmap.append(s)
            pending = False
        elif out:
            out.append(' ')
            nmap.append(s)
        out.extend(tok)
        nmap.extend(range(s, e))
        if dehyphen and tok.endswith('-') and len(tok) > 1 and tok[-2].isalpha():
            nxt = _TOK.search(text, e)
            if nxt and '\n' in text[e:nxt.start()]:
                pending = True
    return ''.join(out), nmap


def fold_view(ntext, drop_nonalnum=True):
    """OCR-folded view: lower-case, typography-normalised, punctuation and spaces dropped, confusable characters merged.
    Returns (folded, fmap) where fmap[i] is the index into ntext of folded char i."""
    out = []
    fmap = array('i')
    t = ntext
    for i, ch in enumerate(t):
        c = ch.translate(_TYPO) if ord(ch) > 127 else ch
        if not c:
            continue
        for cc in c.lower():
            if cc.isalnum():
                out.append(_FOLD_MAP.get(cc, cc))
                fmap.append(i)
            elif not drop_nonalnum:
                out.append(' ' if cc.isspace() else cc)
                fmap.append(i)
    return ''.join(out), fmap


def fold_query(q):
    out = []
    for ch in unicodedata.normalize('NFKC', q).translate(_TYPO).lower():
        if ch.isalnum():
            out.append(_FOLD_MAP.get(ch, ch))
    return ''.join(out)


def banded_edit(a, b, k):
    """Levenshtein distance of a to b if <= k else k+1 (banded DP)."""
    la, lb = len(a), len(b)
    if abs(la - lb) > k:
        return k + 1
    prev = list(range(lb + 1))
    for i in range(1, la + 1):
        cur = [i] + [0] * lb
        lo, hi = max(1, i - k), min(lb, i + k)
        for j in range(1, lo):
            cur[j] = k + 1
        for j in range(lo, hi + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        for j in range(hi + 1, lb + 1):
            cur[j] = k + 1
        prev = cur
        if min(prev) > k:
            return k + 1
    return prev[lb] if prev[lb] <= k else k + 1


def find_all(hay, needle, limit=50):
    res = []
    pos = 0
    while len(res) < limit:
        i = hay.find(needle, pos)
        if i < 0:
            break
        res.append(i)
        pos = i + 1
    return res


def approx_find(fhay, fq, k, limit=20):
    """Positions (start, end, dist) in fhay where fq occurs within edit distance k.  Seed-and-extend; fq long enough for 3 seeds."""
    m = len(fq)
    if m < 30:
        return []
    sl = 10
    seeds = [0, (m - sl) // 2, m - sl]
    found = {}
    for so in seeds:
        seed = fq[so:so + sl]
        for p in find_all(fhay, seed, 200):
            st = p - so
            best = None
            for d in range(-k, k + 1):
                a = max(0, st + d)
                for ln in range(m - k, m + k + 1):
                    seg = fhay[a:a + ln]
                    if len(seg) < m - k:
                        continue
                    dd = banded_edit(fq, seg, k)
                    if dd <= k and (best is None or dd < best[2]):
                        best = (a, a + len(seg), dd)
            if best:
                found[best[0] // 8] = best
        if len(found) >= limit:
            break
    return sorted(found.values())[:limit]


# ---------------------------------------------------------------- number words
_SMALL = {'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
          'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
          'nineteen': 19}
_TENS = {'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}


def _parse_number(toks, i):
    """Value and next index of a number word group starting at toks[i], or (None, i)."""
    n = len(toks)
    w = toks[i]
    if w in ('a', 'an') and i + 1 < n and toks[i + 1] in ('dozen', 'score', 'hundred', 'thousand', 'couple'):
        v = {'dozen': 12, 'score': 20, 'hundred': 100, 'thousand': 1000, 'couple': 2}[toks[i + 1]]
        return v, i + 2
    if w == 'half' and toks[i + 1:i + 3] == ['a', 'dozen']:
        return 6, i + 3
    if w not in _SMALL and w not in _TENS and w not in ('hundred', 'thousand', 'dozen', 'score'):
        return None, i
    total, cur, j, prev = 0, 0, i, None
    while j < n:
        x = toks[j]
        if x == 'and' and prev in ('hundred', 'thousand') and j + 1 < n and (toks[j + 1] in _SMALL or toks[j + 1] in _TENS):
            j += 1
            continue
        if x in _SMALL:
            if prev in ('small',) or (prev == 'tens' and False):
                break
            cur += _SMALL[x]
            prev = 'small' if prev != 'tens' else 'unit'
        elif x in _TENS:
            if prev in ('small', 'tens', 'unit'):
                break
            cur += _TENS[x]
            prev = 'tens'
        elif x == 'hundred':
            if prev in ('hundred', 'thousand') or cur >= 100:
                break
            cur = max(cur, 1) * 100
            prev = 'hundred'
        elif x == 'thousand':
            if prev == 'thousand':
                break
            total += max(cur, 1) * 1000
            cur = 0
            prev = 'thousand'
        elif x in ('dozen', 'score'):
            cur = max(cur, 1) * (12 if x == 'dozen' else 20)
            prev = 'unit'
        else:
            break
        j += 1
    if j == i:
        return None, i
    return total + cur, j


def numbers_in(text):
    """Set of the integers a text states, as digits (1,200 / 1200) or number words (two hundred, a dozen, twenty-five, half a dozen)."""
    t = text.lower()
    nums = set()
    for m in re.finditer(r'\d[\d,]*', t):
        s_ = m.group().replace(',', '')
        if s_.isdigit():
            nums.add(int(s_))
    toks = re.findall(r"[a-z]+", t.replace('-', ' '))
    i = 0
    while i < len(toks):
        v, j = _parse_number(toks, i)
        if v is None:
            i += 1
        else:
            nums.add(v)
            i = max(j, i + 1)
    nums.discard(0)
    return nums


# ---------------------------------------------------------------- source registry and texts
_sources = None


def sources():
    global _sources
    if _sources is None:
        if os.path.exists(SOURCES_PATH):
            _sources = {s['id']: s for s in load_json(SOURCES_PATH)['sources']}
        else:
            _sources = {}
    return _sources


def reload_sources():
    global _sources
    _sources = None
    return sources()


class SourceText:
    """One local text with its normalised view, the map back to original offsets and (for OR vol. 27) the page model."""

    def __init__(self, sid):
        self.id = sid
        s = sources().get(sid)
        if not s:
            raise KeyError('source %r is not in sources.json' % sid)
        self.meta = s
        self.path = os.path.join(ROOT, s['local_path'])
        if not os.path.exists(self.path):
            raise FileNotFoundError(self.path)
        self.page_model = s.get('page_model')
        self.pm = None
        self.records = None
        if self.page_model == 'or27':
            import or27_find as F
            P = F.get_part(int(s['part']))
            self.raw = P.text
            self.ntext, self.nmap = P.ntext, P.nmap
            self.pm = P.pm
            self.records = P.records
        else:
            self.raw = read_text(self.path)
            self.ntext, self.nmap = build_view(self.raw)
        self._fold = None

    @property
    def sha256(self):
        return sha256_file(self.path)

    def fold(self):
        if self._fold is None:
            self._fold = fold_view(self.ntext)
        return self._fold

    def raw_span(self, ns, ne):
        return self.nmap[ns], self.nmap[ne - 1] + 1

    def page_range(self, off_s, off_e):
        """((page, conf, lo, hi) at start, same at end) from the OR page model, or None"""
        if not self.pm:
            return None
        a = self.pm.page_at(off_s)
        b = self.pm.page_at(max(off_s, off_e - 1))
        return a, b


_texts = {}


def source_text(sid):
    if sid not in _texts:
        _texts[sid] = SourceText(sid)
    return _texts[sid]


def match_quote(st, quote, max_edit_ratio=0.025):
    """Find `quote` in SourceText st.  Returns dict(mode, spans=[(raw_start, raw_end, dist)], ...) or mode 'none'.
    Modes in order: exact (whitespace-collapsed, hyphenation joined), typo (case and typography), ocr (confusable fold, punctuation
    ignored), edit (bounded edit distance on the fold)."""
    q = squash(quote)
    if not q:
        return {'mode': 'none', 'spans': []}
    spans = []
    for i in find_all(st.ntext, q):
        a, b = st.raw_span(i, i + len(q))
        spans.append((a, b, 0))
    if spans:
        return {'mode': 'exact', 'spans': spans}
    tq = typo(q)
    tn = _typo_cache(st)
    for i in find_all(tn, tq):
        a, b = st.raw_span(i, min(len(st.ntext), i + len(tq)))
        spans.append((a, b, 0))
    if spans:
        return {'mode': 'typo', 'spans': spans}
    fq = fold_query(q)
    if len(fq) < 12:
        return {'mode': 'none', 'spans': []}
    fh, fm = st.fold()
    for i in find_all(fh, fq):
        ns, ne = fm[i], fm[i + len(fq) - 1] + 1
        a, b = st.raw_span(ns, ne)
        spans.append((a, b, 0))
    if spans:
        return {'mode': 'ocr', 'spans': spans}
    k = int(len(fq) * max_edit_ratio)
    if k >= 1 and len(fq) >= 40:
        for a_, b_, d in approx_find(fh, fq, k):
            if b_ > a_:
                ns, ne = fm[a_], fm[b_ - 1] + 1
                a, b = st.raw_span(ns, ne)
                spans.append((a, b, d))
        if spans:
            return {'mode': 'edit', 'spans': spans, 'max_edit': k}
    return {'mode': 'none', 'spans': []}


_typo_views = {}


def _typo_cache(st):
    v = _typo_views.get(st.id)
    if v is None:
        v = typo(st.ntext)
        _typo_views[st.id] = v
    return v
