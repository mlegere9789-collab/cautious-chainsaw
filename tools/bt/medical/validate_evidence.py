#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mechanical check of the medical evidence files docs/battle-theatre/medical/evidence/<group>.jsonl.

    python3 -I tools/bt/medical/validate_evidence.py <group>        one group (exit 1 when the file is missing or any row fails)
    python3 -I tools/bt/medical/validate_evidence.py --all          every group of groups.json (a group with no file yet is a warning)
    python3 -I tools/bt/medical/validate_evidence.py --self-test    the built-in tests (synthetic texts in a temporary folder)
    python3 -I tools/bt/medical/validate_evidence.py --locate SOURCE-ID "quote" [--file KEY] [--near OFFSET]
                                                     where the quote stands in the local text (offset, page hint) for filling a row
    python3 -I tools/bt/medical/validate_evidence.py --check-sources   every local file of the source registry and ledger against its sha256
    python3 -I tools/bt/medical/validate_evidence.py --list-groups     the group ids, one per line
    options: --json PATH (machine report: every row with its issues; the integration step applies only rows with ok true),
             --summary (rows by tier per group), -v (also OK rows and warnings), --rate 0.04 (OCR edit tolerance, share of the quote)

Exit code 0 only when nothing failed; every failure (a bad row, a missing file, a usage error, a failed self-test) exits 1.

What a row must satisfy is written in docs/battle-theatre/medical/evidence/PLAN.md, section "Evidence contract". In short, every row has
an id of the form med.<group>.<nnn> (unique over all groups), a topic of the group, a kind with its data, a claim, a tier, the source with its
edition, a page, a quote found in the named local text (whitespace, hyphenation, line-break page heads and OCR noise tolerated; every number
in the quote and every number in the claim or value must be the source's own), the character offset of the quote, a scene statement (what a
scene may show because of the row and from which Graphic detail setting), and the tier rules: documented needs a non-lead source and its quote,
inferred needs documented basis rows and the step written out, plausible-procedural needs its basis written, open gap needs the gap written.

Offsets are CHARACTER offsets into the local file decoded as UTF-8 with newline='' (no newline translation), start inclusive, end exclusive.
"""
import os, re, sys, json, hashlib, argparse, unicodedata, bisect, random, tempfile, shutil, time
from array import array

try:
    import numpy as np
except Exception:  # the pure-python path gives the same results, only slower
    np = None

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

TIERS = ('documented', 'inferred', 'plausible-procedural', 'open gap')
CLASSES = {
    'official-report': 'Official Records, inspector and medical-director reports, Surgeon General documents',
    'official-history': 'The Medical and Surgical History of the War of the Rebellion and other Surgeon General histories',
    'period-manual': 'surgical and medical manuals, regulations and supply tables of 1860 to 1865',
    'memoir-primary': 'first-person accounts by participants (diaries, letters, memoirs) written within their lifetime',
    'contemporary-print': 'newspapers, pamphlets and society reports of 1863 to 1866',
    'institutional-history': 'histories and reports of the Sanitary and Christian Commissions and like bodies, written within a few years',
    'regimental-history': 'state, regimental and monument-commission volumes (collective witness, named casualties, hospital notes)',
    'nps-report': 'National Park Service reports and pages (official secondary; its own 1863 basis is read with it)',
    'photo-record': 'catalogued photographs, drawings and prints of the period (caption text; what is seen needs the image viewed)',
    'reference-secondary': 'later scholarly reference: a pointer, or inferred at most, never documented on its own',
    'lead': 'crowd-sourced, commercial, blog, forum, Wikipedia, auction and marker-transcription pages: a lead only (tier open gap)',
}
LEAD_CLASSES = ('lead',)
NO_DOCUMENTED_CLASSES = ('lead', 'reference-secondary')

REGIONS = ('head', 'face', 'neck', 'spine', 'chest', 'abdomen', 'pelvis', 'back', 'shoulder', 'upper-arm', 'elbow', 'forearm', 'wrist-hand',
           'hip', 'thigh', 'knee', 'leg', 'ankle-foot', 'multiple', 'unspecified')
WEAPONS = ('small-arms-conical-ball', 'small-arms-round-ball', 'small-arms-buck-and-ball', 'small-arms-buckshot', 'artillery-solid-shot',
           'artillery-shell', 'artillery-case-shot', 'artillery-canister', 'edged-sabre', 'edged-bayonet', 'edged-other', 'blunt', 'accident',
           'other', 'unspecified')
TREAT_CATS = ('triage', 'first-aid', 'haemorrhage-control', 'anaesthesia', 'stimulant-analgesic', 'probing-extraction', 'wound-cleansing',
              'dressing', 'splint-apparatus', 'amputation', 'excision-resection', 'ligation', 'trephining', 'other-operation', 'nursing', 'diet',
              'hygiene', 'cautery-caustic', 'disease-treatment', 'transport', 'other')
ACTORS = ('surgeon', 'assistant-surgeon', 'operating-surgeon', 'steward', 'ward-master', 'nurse-male', 'nurse-female', 'orderly', 'litter-bearer',
          'ambulance-driver', 'chaplain', 'commission-delegate', 'civilian-volunteer', 'patient', 'other')
SETTINGS = ('regimental-aid-post', 'field-dressing-station', 'division-hospital', 'corps-hospital', 'general-hospital', 'ambulance', 'rail-car',
            'tent', 'barn', 'house', 'church', 'open-air', 'any', 'other')
TIMINGS = ('primary', 'intermediate', 'secondary', 'any')
COUNT_WHAT = ('patients', 'staff', 'surgeons', 'nurses', 'stewards', 'tents', 'beds', 'deaths', 'operations', 'amputations', 'ambulances', 'wagons',
              'rations', 'graves', 'other')
SITE_EVENTS = ('opened', 'closed', 'moved', 'captured', 'evacuated', 'shelled', 'burned', 'inspected', 'visited', 'other')
SIDES = ('union', 'confederate', 'both', 'general')
CASE_ROLES = ('patient', 'surgeon', 'nurse', 'steward', 'chaplain', 'delegate', 'civilian', 'other')
SCENE_ELEMENTS = ('table', 'tent', 'bedding', 'water', 'light', 'waste', 'kitchen', 'dead-house', 'pile', 'bandage', 'litter', 'ambulance', 'wagon',
                  'furniture', 'sign-flag', 'ground-cover', 'other')
SITE_ID = r'^site\.[a-z0-9]+(?:-[a-z0-9]+)*$'

# kind -> required keys of the data object, enumerations, whether a value or a date scope is required
KINDS = {
    'fact': {'req': []},
    'wound-class': {'req': ['name_period', 'weapon', 'region'], 'enums': {'weapon': WEAPONS, 'region': REGIONS}},
    'wound-stat': {'req': ['population', 'measure'], 'value': True},
    'treatment': {'req': ['name_period', 'category'], 'enums': {'category': TREAT_CATS, 'setting': SETTINGS, 'timing': TIMINGS}},
    'treatment-step': {'req': ['treatment', 'order', 'action'], 'enums': {'actor': ACTORS}, 'ints': ['order']},
    'instrument': {'req': ['name_period', 'use']},
    'supply': {'req': ['item']},
    'role': {'req': ['title', 'duties']},
    'org': {'req': ['entity']},
    'site': {'req': ['site_id', 'name', 'side'], 'enums': {'side': SIDES}, 'site_ids': ['site_id']},
    'site-layout': {'req': ['site_id', 'item'], 'site_ids': ['site_id']},
    'site-count': {'req': ['site_id', 'what'], 'enums': {'what': COUNT_WHAT}, 'value': True, 'date': True, 'site_ids': ['site_id']},
    'site-event': {'req': ['site_id', 'event'], 'enums': {'event': SITE_EVENTS}, 'date': True, 'site_ids': ['site_id']},
    'case': {'req': ['person', 'role'], 'enums': {'role': CASE_ROLES}, 'date': True},
    'burial': {'req': ['practice']},
    'scene-practice': {'req': ['element', 'description'], 'enums': {'element': SCENE_ELEMENTS}},
}

# The words the page's own copy test refuses (tests/real.spec.mjs FORBIDDEN and the accuracy words), applied to every field that may be shipped.
COPY_FORBIDDEN = re.compile(r'\b(AI|A\.I\.|Claude|Anthropic|LLM|language model|generated|automated|subagent|agent|prompt|accurate|accurately|accuracy|'
                            r'historically accurate|exactly where|verified|authentic)\b', re.I)
SEGMENT_SPLIT = re.compile(r'\s*(?:…|\.{3,}|(?:\.\s){2,}\.|\[\s*(?:…|\.{3})\s*\])\s*')
ID_RE = re.compile(r'^med\.([a-z0-9]+(?:-[a-z0-9]+)*)\.(\d{3,5})$')
GROUP_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
TOPIC_RE = re.compile(r'^[a-z0-9]+(?:[.-][a-z0-9]+)*$')
PAGE_RE = re.compile(r'^(?:pdf:\d{1,5}|\d{1,5}(?:-\d{1,5})?|[ivxlcdm]{1,8}(?:-[ivxlcdm]{1,8})?|n/a)$')
DATE_RE = re.compile(r'^\d{4}(?:-\d{2}-\d{2}(?:T\d{2}:\d{2})?)?$')
MIN_QUOTE_ALNUM = 25
MIN_SEGMENT_ALNUM = 12
MAX_QUOTE_CHARS = 1500
OFFSET_SLACK = 8
SEGMENT_MAX_GAP = 4000
DEFAULT_RATE = 0.04


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blk in iter(lambda: f.read(1 << 20), b''):
            h.update(blk)
    return h.hexdigest()


# ------------------------------------------------------------------------------------------------------------------------------------------
# Folding: every character that is not a letter or digit is dropped; letters are lower-cased and accents removed. Whitespace, hyphenation at the
# end of a line, quotation marks, dashes and any punctuation therefore never decide a match, and the same folding is applied to the quote.
# ------------------------------------------------------------------------------------------------------------------------------------------
_SPECIAL_FOLD = {'ſ': 's', 'ß': 's', 'æ': 'a', 'Æ': 'a', 'œ': 'o', 'Œ': 'o', 'ø': 'o', 'Ø': 'o', 'đ': 'd', 'ł': 'l', 'ı': 'i'}


def fold_char(ch):
    o = ord(ch)
    if o < 128:
        if 'a' <= ch <= 'z' or '0' <= ch <= '9':
            return ch
        if 'A' <= ch <= 'Z':
            return ch.lower()
        return ''
    if ch in _SPECIAL_FOLD:
        return _SPECIAL_FOLD[ch]
    for c in unicodedata.normalize('NFKD', ch):
        if c.isascii() and c.isalnum():
            return c.lower()
    return ''


def _build_lut():
    lut = bytearray(65536)
    for cp in range(65536):
        if 0xD800 <= cp <= 0xDFFF:
            continue
        c = fold_char(chr(cp))
        if c:
            lut[cp] = ord(c)
    return bytes(lut)


LUT = _build_lut()


def fold(s):
    return ''.join(fold_char(c) for c in s)


class View:
    """s: the folded characters; offs[i]: the offset in the raw text of s[i]."""
    __slots__ = ('s', 'offs')

    def __init__(self, s, offs):
        self.s, self.offs = s, offs


def build_view(text, drop=None):
    """drop: raw spans (start, end) left out of the view (running heads)."""
    if np is not None:
        codes = np.frombuffer(text.encode('utf-32-le', 'surrogatepass'), dtype='<u4')
        folded = np.frombuffer(LUT, dtype=np.uint8)[np.minimum(codes, 65535)]
        folded[codes > 65535] = 0
        if drop:
            for a, b in drop:
                folded[a:b] = 0
        keep = np.flatnonzero(folded)
        return View(folded[keep].tobytes().decode('ascii'), keep.astype(np.int32))
    out = []
    offs = array('i')
    dropped = sorted(drop or [])
    di = 0
    for i, ch in enumerate(text):
        while di < len(dropped) and dropped[di][1] <= i:
            di += 1
        if di < len(dropped) and dropped[di][0] <= i < dropped[di][1]:
            continue
        o = ord(ch)
        if o > 65535:
            continue
        v = LUT[o]
        if v:
            out.append(chr(v))
            offs.append(i)
    return View(''.join(out), offs)


# ------------------------------------------------------------------------------------------------------------------------------------------
# Running heads and page numbers of OCR text: a line is a head when its letters are mostly capitals, it starts or ends with a number (or has none)
# and the same words recur on at least four lines of the text. Heads are left out of the second view so that a quote may cross a page break.
# ------------------------------------------------------------------------------------------------------------------------------------------
def _mostly_upper(s):
    letters = [c for c in s if c.isalpha()]
    return len(letters) >= 6 and sum(c.isupper() for c in letters) / len(letters) >= 0.7


def detect_heads(text, min_repeat=4):
    """Return a list of (start, end, number or None, bare) for the running-head lines found in text. A head is a line of mostly capitals,
    with a number at its start or end or none, whose words recur on at least min_repeat lines (or nearly recur: OCR spells the same head
    in several ways). bare is True for a line that holds only a page number next to a head."""
    import difflib
    lines = []
    pos = 0
    for line in text.split('\n'):
        lines.append((pos, pos + len(line), line.strip()))
        pos += len(line) + 1
    cand, keys = [], {}
    for i, (a, b, s) in enumerate(lines):
        if not 3 <= len(s) <= 90:
            continue
        m = re.match(r'^(\d{1,4})\s+(\S.*)$', s)
        if m and _mostly_upper(m.group(2)):
            key, num = fold(m.group(2)), int(m.group(1))
        else:
            m = re.match(r'^(\S.*?)\s+(\d{1,4})$', s)
            if m and _mostly_upper(m.group(1)):
                key, num = fold(m.group(1)), int(m.group(2))
            elif _mostly_upper(s) and not re.search(r'\d', s):
                key, num = fold(s), None
            else:
                continue
        if len(key) < 6:
            continue
        cand.append((i, key, num))
        keys[key] = keys.get(key, 0) + 1
    good = [k for k, n in keys.items() if n >= min_repeat]
    verdict = {}

    def is_head(key):
        if key in verdict:
            return verdict[key]
        ok = keys[key] >= min_repeat
        if not ok:
            for g in good:
                if abs(len(g) - len(key)) <= 4 and difflib.SequenceMatcher(None, key, g).ratio() >= 0.82:
                    ok = True
                    break
        verdict[key] = ok
        return ok

    confirmed = {i: num for i, key, num in cand if is_head(key)}
    heads = [(lines[i][0], lines[i][1], num, False) for i, num in confirmed.items()]
    near = set()
    for i in confirmed:
        near.update(range(max(0, i - 3), min(len(lines), i + 4)))
    for i in near:
        a, b, s = lines[i]
        if i not in confirmed and re.match(r'^\d{1,4}$', s):
            heads.append((a, b, int(s), True))
    heads.sort()
    return heads


def head_pages(heads, window=20):
    """[(start offset, page)] from the running heads. One head is one page, so a head's page is its index plus a shift that is constant over
    long stretches of a book; the shift is the commonest of (printed number minus index) among the numbered heads near it. Numbers that OCR
    garbled, heads that OCR lost or doubled, then move the shift only locally and never run away."""
    seq = [h for h in heads if not h[3]]
    if not seq:
        return []
    deltas = [(i, h[2] - i) for i, h in enumerate(seq) if h[2] is not None]
    if not deltas:
        return []
    out = []
    glob = {}
    for _, d in deltas:
        glob[d] = glob.get(d, 0) + 1
    gmode = max(glob, key=lambda k: glob[k])
    for i, h in enumerate(seq):
        near = {}
        for j, d in deltas:
            if abs(j - i) <= window:
                near[d] = near.get(d, 0) + 1
        mode = max(near, key=lambda k: (near[k], -abs(k - gmode))) if near else gmode
        out.append((h[0], i + mode))
    return out


class RawText:
    """One local text file, read once; the views and the page indexes are built when first needed."""

    def __init__(self, path, page_model='none', page_marker=None):
        self.path = path
        with open(path, encoding='utf-8', errors='replace', newline='') as f:
            self.text = f.read()
        self.page_model = page_model
        self.page_marker = page_marker
        self._a = self._b = self._heads = self._markers = self._hp = self._hp_starts = None
        self._marker_starts = None

    @property
    def heads(self):
        if self._heads is None:
            self._heads = detect_heads(self.text)
        return self._heads

    @property
    def view_a(self):
        if self._a is None:
            self._a = build_view(self.text)
        return self._a

    @property
    def view_b(self):
        if self._b is None:
            self._b = build_view(self.text, [(a, b) for a, b, _, _ in self.heads])
        return self._b

    def view(self, name):
        return self.view_a if name == 'A' else self.view_b

    def slice_text(self, name, a, b):
        """The raw text of [a, b) without the running heads when the match was made on view B."""
        if name == 'A' or not self.heads:
            return self.text[a:b]
        out, pos = [], a
        for hs, he, _, _ in self.heads:
            if he <= a or hs >= b:
                continue
            if hs > pos:
                out.append(self.text[pos:hs])
            pos = max(pos, he)
        out.append(self.text[pos:b])
        return ' '.join(out)

    def page_hint(self, off):
        """(page number or None, basis text) at a raw offset, from the page marker lines or the running heads; a hint only."""
        if self.page_model == 'marker' and self.page_marker:
            if self._markers is None:
                self._markers = [(m.start(), int(m.group(1))) for m in re.finditer(self.page_marker, self.text, re.M)]
                self._marker_starts = [a for a, _ in self._markers]
            if self._markers:
                i = bisect.bisect_right(self._marker_starts, off) - 1
                if i >= 0:
                    return self._markers[i][1], 'page marker line (PDF page index)'
            return None, 'no page marker before the offset'
        if self.page_model.startswith('or27:'):
            try:
                sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
                import or27_find
                pg = or27_find.get_part(int(self.page_model[5:])).pm.page_at(off)
                return pg['page'], 'OR27 page model (%s)' % pg.get('conf')
            except Exception as e:  # the page model is a convenience: its absence never fails a row
                return None, 'the OR27 page model could not be loaded (%s)' % type(e).__name__
        if self.page_model == 'heads':
            if self._hp is None:
                self._hp = head_pages(self.heads)
                self._hp_starts = [a for a, _ in self._hp]
            if self._hp:
                i = bisect.bisect_right(self._hp_starts, off) - 1
                if i >= 0 and off - self._hp[i][0] < 20000:
                    return self._hp[i][1], 'running heads before the offset (OCR; a hint, may be off by a page)'
            return None, 'no running head found before the offset'
        return None, 'source has no page model'


# ------------------------------------------------------------------------------------------------------------------------------------------
# Approximate matching: Myers' bit-parallel edit distance (the pattern is found as a substring of the text with at most e edits), seeded by the
# exact occurrences of e+1 disjoint pieces of the pattern (one of them is always intact when there are at most e edits).
# ------------------------------------------------------------------------------------------------------------------------------------------
def myers_search(pat, text, anchored_start=False):
    """Smallest edit distance of pat to a substring of text, and the index in text where such a substring ends (first such end).
    With anchored_start the substring must begin at text[0]."""
    m = len(pat)
    if m == 0:
        return 0, -1
    peq = {}
    for i, c in enumerate(pat):
        peq[c] = peq.get(c, 0) | (1 << i)
    mask = (1 << m) - 1
    hi = 1 << (m - 1)
    pv, mv, score = mask, 0, m
    best, best_end = None, -1
    for j, c in enumerate(text):
        eq = peq.get(c, 0)
        xv = eq | mv
        xh = ((((eq & pv) + pv) & mask) ^ pv) | eq
        ph = mv | (~(xh | pv) & mask)
        mh = pv & xh
        if ph & hi:
            score += 1
        elif mh & hi:
            score -= 1
        ph <<= 1
        mh <<= 1
        if anchored_start:
            ph |= 1
        ph &= mask
        mh &= mask
        pv = mh | (~(xv | ph) & mask)
        mv = ph & xv
        if best is None or score < best:
            best, best_end = score, j
    if best is None:
        return m, -1
    return best, best_end


def dp_search(pat, text, anchored_start=False):
    """Plain dynamic programme with the same contract as myers_search (used to test it)."""
    m, n = len(pat), len(text)
    prev = list(range(m + 1))  # column 0: empty text prefix
    best, best_end = None, -1
    for j in range(n):
        cur = [(j + 1) if anchored_start else 0] + [0] * m
        for i in range(1, m + 1):
            cur[i] = min(prev[i - 1] + (pat[i - 1] != text[j]), prev[i] + 1, cur[i - 1] + 1)
        if best is None or cur[m] < best:
            best, best_end = cur[m], j
        prev = cur
    return (best if best is not None else m), best_end


def locate(view_s, q, max_err, piece_cap=400):
    """Candidates (start, end, distance) of q in view_s, best first: exact occurrences, else approximate ones within max_err edits."""
    res = []
    i = view_s.find(q)
    while i != -1 and len(res) < 60:
        res.append((i, i + len(q), 0))
        i = view_s.find(q, i + 1)
    if res or max_err <= 0:
        return res
    m = len(q)
    k = max_err + 1
    plen = m // k
    if plen < 6:
        return res
    votes = {}
    for pi in range(k):
        qi = pi * plen
        piece = q[qi:qi + plen]
        hits, pos = [], view_s.find(piece)
        while pos != -1 and len(hits) <= piece_cap:
            hits.append(pos)
            pos = view_s.find(piece, pos + 1)
        if len(hits) > piece_cap:
            continue  # a piece this common says nothing about where the quote stands; the other pieces decide
        for pos in hits:
            votes[pos - qi] = votes.get(pos - qi, 0) + 1
    if not votes:
        return res
    diags = sorted(votes)
    clusters, cur = [], [diags[0]]
    for d in diags[1:]:
        if d - cur[-1] <= max_err + 2:
            cur.append(d)
        else:
            clusters.append(cur)
            cur = [d]
    clusters.append(cur)
    clusters.sort(key=lambda c: -sum(votes[d] for d in c))
    for cl in clusters[:6]:
        ws = max(0, cl[0] - max_err - 2)
        we = min(len(view_s), cl[-1] + m + max_err + 2)
        win = view_s[ws:we]
        dist, end = myers_search(q, win)
        if end < 0 or dist > max_err:
            continue
        rev = win[:end + 1][::-1]
        d2, rend = myers_search(q[::-1], rev, anchored_start=True)
        if rend < 0 or d2 > max_err:
            continue
        start = ws + end + 1 - (rend + 1)
        res.append((start, ws + end + 1, min(dist, d2)))
    res.sort(key=lambda t: (t[2], t[0]))
    return res


# ------------------------------------------------------------------------------------------------------------------------------------------
# Numbers: digits and spelled-out numbers. A quote may not change a number of the text, and a claim or value may state only numbers of the quote.
# ------------------------------------------------------------------------------------------------------------------------------------------
_UNITS = {'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11,
          'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19}
_TENS = {'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}
_MAGN = {'hundred': 100, 'thousand': 1000, 'million': 1000000}
NUMBER_WORDS = set(_UNITS) | set(_TENS) | set(_MAGN)
_COMPOUND = re.compile(r'^(%s)(%s)$' % ('|'.join(_TENS), '|'.join(k for k in _UNITS if 0 < _UNITS[k] < 10)))


def number_tokens(text):
    """The number words of a text in order, compounds such as twentyfive split, line-end hyphens joined."""
    t = re.sub(r'-[ \t]*\r?\n[ \t]*', '', text.lower())
    out = []
    for tok in re.findall(r'[a-z]+', t):
        if tok in NUMBER_WORDS:
            out.append(tok)
        else:
            m = _COMPOUND.match(tok)
            if m:
                out.extend([m.group(1), m.group(2)])
    return out


def parse_numbers(text, skip_lone_one=False, spaced=False):
    """The numbers written in a text, digits (thousands commas dropped) and spelled-out runs, as floats. spaced=True (for a quote, the text
    of the source) also reads OCR's "1, 995" as 1995 in addition to 1 and 995."""
    found = []
    t = text.replace('½', ' 1/2 ')
    for m in re.finditer(r'\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?', t):
        found.append(float(m.group(0).replace(',', '')))
    if spaced:
        for m in re.finditer(r'(?<!\d)\d{1,3}(?:,\s\d{3})+(?!\d)', t):
            found.append(float(re.sub(r'[,\s]', '', m.group(0))))
    t2 = re.sub(r'-[ \t]*\r?\n[ \t]*', '', t.lower())
    toks = []
    for tok in re.findall(r'[a-z]+', t2):
        m = _COMPOUND.match(tok)
        toks.extend([m.group(1), m.group(2)] if m else [tok])
    run, i = [], 0
    while i <= len(toks):
        tok = toks[i] if i < len(toks) else None
        if tok in NUMBER_WORDS or (tok == 'and' and run and i + 1 < len(toks) and toks[i + 1] in NUMBER_WORDS):
            if tok != 'and':
                run.append(tok)
        else:
            if run:
                if not (skip_lone_one and run == ['one']):
                    found.append(float(_words_value(run)))
            run = []
        i += 1
    return found


def _words_value(run):
    total, cur = 0, 0
    for w in run:
        if w in _UNITS or w in _TENS:
            cur += _UNITS.get(w, _TENS.get(w, 0))
        elif w == 'hundred':
            cur = (cur or 1) * 100
        else:
            total += (cur or 1) * _MAGN[w]
            cur = 0
    return total + cur


def digit_runs(folded):
    return re.findall(r'\d+', folded)


# ------------------------------------------------------------------------------------------------------------------------------------------
# Configuration, sources, ledger
# ------------------------------------------------------------------------------------------------------------------------------------------
class Config:
    def __init__(self, root=ROOT, evid=None, groups=None, sources=None, ledger=None, clips=None):
        self.root = root
        med = os.path.join(root, 'docs', 'battle-theatre', 'medical')
        self.evid = evid or os.path.join(med, 'evidence')
        self.groups = groups or os.path.join(self.evid, 'groups.json')
        self.sources = sources or os.path.join(med, 'sources.json')
        self.ledger = ledger or os.path.join(med, 'SOURCES.md')
        self.clips = clips if clips is not None else os.path.join(root, 'docs', 'battle-theatre', 'app', 'data', 'anim3d', 'clips.json')
        self.repo_ids_files = [os.path.join(root, 'docs', 'battle-theatre', p) for p in
                               ('structures/hospitals.json', 'structures/structures.json', 'structures/state_schedule.json',
                                'app/data/structures3d.json', 'app/data/gazetteer.json')]


LEDGER_COLS = ['date', 'source id', 'class', 'lead', 'edition', 'local path', 'sha256', 'bytes', 'rights', 'url', 'group']


def parse_ledger(md):
    """Rows of the acquisition ledger of SOURCES.md: one table row per local file, 11 cells, appended with >>."""
    rows = []
    for line in md.splitlines():
        s = line.strip()
        if not s.startswith('|') or not s.endswith('|'):
            continue
        cells = [c.strip() for c in s.strip('|').split('|')]
        if len(cells) != len(LEDGER_COLS) or cells[0].lower() == 'date' or set(cells[0]) <= set('-: '):
            continue
        rows.append(dict(zip(LEDGER_COLS, cells)))
    return rows


class SourceInfo:
    def __init__(self, sid):
        self.id = sid
        self.cls = None
        self.lead = False
        self.edition = ''
        self.files = {}        # key -> {'path', 'sha256', 'page_model', 'page_marker'}
        self.rate = DEFAULT_RATE
        self.default_file = None
        self.registry = False
        self.ledger = False


class Sources:
    def __init__(self, cfg):
        self.cfg = cfg
        self.by_id = {}
        self.problems = []
        if os.path.exists(cfg.sources):
            reg = json.load(open(cfg.sources, encoding='utf-8'))
            for sid, e in (reg.get('sources') or {}).items():
                s = SourceInfo(sid)
                s.registry = True
                s.cls = e.get('class')
                s.lead = bool(e.get('lead')) or s.cls in LEAD_CLASSES
                s.edition = e.get('edition') or ''
                s.rate = float(e.get('ocr_error_rate', DEFAULT_RATE))
                s.default_file = e.get('default_file')
                for key, f in (e.get('files') or {}).items():
                    s.files[key] = {'path': f.get('path'), 'sha256': f.get('sha256'), 'page_model': f.get('page_model', e.get('page_model', 'none')),
                                    'page_marker': f.get('page_marker', e.get('page_marker'))}
                self.by_id[sid] = s
        if os.path.exists(cfg.ledger):
            for r in parse_ledger(open(cfg.ledger, encoding='utf-8').read()):
                sid = r['source id']
                s = self.by_id.get(sid) or SourceInfo(sid)
                s.ledger = True
                if s.cls is None:
                    s.cls = r['class']
                if r['lead'].lower() in ('yes', 'true', '1'):
                    s.lead = True
                s.edition = s.edition or r['edition']
                key = 'main'
                f = s.files.setdefault(key, {'path': None, 'sha256': None, 'page_model': 'none', 'page_marker': None})
                if f['path'] and f['path'] != r['local path'] and s.registry:
                    self.problems.append('ledger path of %s differs from the registry path (%s vs %s)' % (sid, r['local path'], f['path']))
                f['path'] = f['path'] or r['local path']
                if f['sha256'] and f['sha256'] != r['sha256']:
                    self.problems.append('ledger sha256 of %s differs from the registry sha256' % sid)
                f['sha256'] = f['sha256'] or r['sha256']
                self.by_id[sid] = s
        for s in self.by_id.values():
            if s.cls is not None and s.cls not in CLASSES:
                self.problems.append('source %s has the unknown class %r' % (s.id, s.cls))

    def resolve(self, ref):
        """(SourceInfo, key, absolute path, expected sha256) for a row's source object, or raises KeyError with the reason."""
        sid = ref.get('id')
        s = self.by_id.get(sid)
        if s is None:
            raise KeyError('source %r is in neither sources.json nor the ledger of SOURCES.md' % sid)
        key = ref.get('file')
        if key is None:
            if s.default_file in s.files:
                key = s.default_file
            elif len(s.files) == 1:
                key = next(iter(s.files))
            elif 'main' in s.files:
                key = 'main'
            else:
                raise KeyError('source %s has several files (%s): name one in source.file' % (sid, ', '.join(sorted(s.files)) or 'none'))
        f = s.files.get(key)
        if f is None or not f.get('path'):
            raise KeyError('source %s has no file %r (it is not local: acquire it and append a ledger line to SOURCES.md)' % (sid, key))
        path = f['path'] if os.path.isabs(f['path']) else os.path.join(self.cfg.root, f['path'])
        if not os.path.exists(path):
            raise KeyError('local file of %s is missing: %s' % (sid, f['path']))
        if not f.get('sha256'):
            raise KeyError('file %s of source %s has no sha256 in the registry or the ledger (append the ledger line after downloading)' % (key, sid))
        return s, key, path, f


class TextStore:
    """Keeps at most three texts in memory (the surgical volumes are 4 to 9 MB each)."""

    def __init__(self, keep=3):
        self.keep, self.items, self.order, self.hashes = keep, {}, [], {}

    def get(self, path, f):
        if path not in self.hashes:
            self.hashes[path] = sha256_file(path)
        if self.hashes[path] != f['sha256']:
            raise KeyError('sha256 of %s is %s, expected %s: the file changed, the offsets are void' % (path, self.hashes[path][:16], f['sha256'][:16]))
        if path not in self.items:
            if len(self.order) >= self.keep:
                self.items.pop(self.order.pop(0), None)
            self.items[path] = RawText(path, f.get('page_model') or 'none', f.get('page_marker'))
            self.order.append(path)
        return self.items[path]


# ------------------------------------------------------------------------------------------------------------------------------------------
# Quote matching
# ------------------------------------------------------------------------------------------------------------------------------------------
class Found:
    def __init__(self):
        self.ok = False
        self.reason = ''
        self.start = self.end = None      # raw offsets
        self.dist = 0
        self.mode = ''                    # exact | fuzzy | segments
        self.view = ''                    # A | B
        self.segs = []                    # (raw start, raw end, distance) per segment
        self.vstart = self.vend = None    # view offsets of the first and last character
        self.slices = []                  # the raw text of each matched segment (running heads left out when view B matched)


def max_err_for(n, rate):
    if rate <= 0:
        return 0
    return min(80, max(1, int(rate * n)))


def _nearest(cands, view, near):
    if near is None or len(cands) < 2:
        return cands[0]
    return min(cands, key=lambda c: abs(int(view.offs[c[0]]) - near))


def _segments(view, segs, rate, near):
    """Segments in order, each found (exactly or approximately) after the previous one, at most SEGMENT_MAX_GAP raw characters apart."""
    lists = []
    for q in segs:
        c = locate(view.s, q, max_err_for(len(q), rate))
        if not c:
            return None
        lists.append(sorted(c, key=lambda t: t[0]))
    best = None
    for first in lists[0]:
        chain, prev, ok = [first], first, True
        for lst in lists[1:]:
            nxt = None
            for c in lst:
                if c[0] >= prev[1] and int(view.offs[c[0]]) - int(view.offs[prev[1] - 1]) <= SEGMENT_MAX_GAP:
                    nxt = c
                    break
            if nxt is None:
                ok = False
                break
            chain.append(nxt)
            prev = nxt
        if ok:
            span = int(view.offs[chain[-1][1] - 1]) - int(view.offs[chain[0][0]])
            key = (abs(int(view.offs[chain[0][0]]) - near) if near is not None else 0, span)
            if best is None or key < best[0]:
                best = (key, chain)
    return best[1] if best else None


def find_quote(rt, quote, rate=DEFAULT_RATE, near=None):
    """Find a quote in a RawText. Tries the folded text, then the folded text without running heads; a quote that does not match as one piece
    is split at its ellipses and each piece must be found, in order, within SEGMENT_MAX_GAP characters of the one before."""
    f = Found()
    qn = fold(quote)
    if len(qn) < MIN_QUOTE_ALNUM:
        f.reason = 'quote too short (%d letters and digits, at least %d)' % (len(qn), MIN_QUOTE_ALNUM)
        return f
    pieces = [p for p in SEGMENT_SPLIT.split(quote) if p.strip()]
    # an exact match on either view is preferred to an approximate one on the first view (a page head inside the quote costs edits on view A)
    for tol in (0.0, rate):
        for name in ('A', 'B'):
            view = rt.view(name)
            cands = locate(view.s, qn, max_err_for(len(qn), tol))
            if cands:
                a, b, d = _nearest(cands, view, near)
                _fill(f, rt, view, name, [(a, b, d)], 'exact' if d == 0 else 'fuzzy')
                return _digit_checks(f, rt, view, [qn])
    if len(pieces) > 1:
        pn = [fold(p) for p in pieces]
        if min(len(x) for x in pn) < MIN_SEGMENT_ALNUM:
            f.reason = 'a segment between ellipses is shorter than %d letters and digits' % MIN_SEGMENT_ALNUM
            return f
        for tol in (0.0, rate):
            for name in ('A', 'B'):
                view = rt.view(name)
                chain = _segments(view, pn, tol, near)
                if chain:
                    _fill(f, rt, view, name, chain, 'segments')
                    return _digit_checks(f, rt, view, pn)
        f.reason = 'the segments of the quote are not all found, in order, within %d characters of each other' % SEGMENT_MAX_GAP
        return f
    # no match: report how close the best approximate position is, for the author
    view = rt.view_a
    loose = locate(view.s, qn, max(1, int(0.15 * len(qn))))
    f.reason = 'quote not found (tolerance %d edits in %d letters and digits)%s' % (
        max_err_for(len(qn), rate), len(qn), '; the nearest passage differs by %d edits (near raw offset %d)' % (loose[0][2], int(view.offs[loose[0][0]])) if loose else '')
    return f


def _fill(f, rt, view, name, chain, mode):
    f.view, f.mode = name, mode
    f.vstart, f.vend = chain[0][0], chain[-1][1]
    f.start, f.end = int(view.offs[chain[0][0]]), int(view.offs[chain[-1][1] - 1]) + 1
    f.dist = sum(c[2] for c in chain)
    f.segs = [(int(view.offs[c[0]]), int(view.offs[c[1] - 1]) + 1, c[2]) for c in chain]
    f.slices = [rt.slice_text(name, a, b) for a, b, _ in f.segs]
    f.ok = True


def _digit_checks(f, rt, view, qnorms):
    """A matched quote may not change a digit of the text or cut a number off at either end. The ends are judged on the raw text: a digit that
    touches the quote, or a comma and three digits that continue it, makes the quote a piece of a larger number; a footnote mark after a full
    stop ("July 5.9") does not."""
    raw = rt.text
    for (a, b, _), qn in zip(f.segs, qnorms):
        va = bisect.bisect_left(view.offs, a)
        vb = bisect.bisect_left(view.offs, b)
        seg_view = view.s[va:vb]
        if digit_runs(qn) != digit_runs(seg_view):
            f.ok, f.reason = False, 'the digits of the quote %s differ from the text %s (an OCR slip is not corrected silently: use ocr.corrections)' % (digit_runs(qn), digit_runs(seg_view))
            return f
        if qn[:1].isdigit() and a > 0 and (raw[a - 1].isdigit() or (raw[a - 1] == ',' and a > 1 and raw[a - 2].isdigit())):
            f.ok, f.reason = False, 'the quote starts inside a number of the text'
            return f
        if qn[-1:].isdigit() and b < len(raw) and (raw[b].isdigit() or (raw[b] == ',' and raw[b + 1:b + 4].isdigit() and len(raw[b + 1:b + 4]) == 3 and not raw[b + 4:b + 5].isdigit())):
            f.ok, f.reason = False, 'the quote ends inside a number of the text'
            return f
    return f


def check_number_words(f, quote):
    """Spelled-out numbers (words, not folded letters) of the quote against the text it matched, segment by segment; only needed when the
    match was approximate, because an exact match of the folded letters cannot change a number word."""
    pieces = [p for p in SEGMENT_SPLIT.split(quote) if p.strip()] if f.mode == 'segments' else [quote]
    for piece, sl in zip(pieces, f.slices):
        qt, st = number_tokens(piece), number_tokens(sl)
        if qt != st:
            return 'the spelled-out numbers of the quote %s differ from the text %s' % (qt, st)
    return None


# ------------------------------------------------------------------------------------------------------------------------------------------
# Rows
# ------------------------------------------------------------------------------------------------------------------------------------------
class Issue:
    def __init__(self, level, code, msg):
        self.level, self.code, self.msg = level, code, msg

    def as_dict(self):
        return {'level': self.level, 'code': self.code, 'msg': self.msg}

    def __str__(self):
        return '%s %s %s' % (self.level, self.code, self.msg)


class RowResult:
    def __init__(self, rid, group, line):
        self.id, self.group, self.line = rid, group, line
        self.issues = []
        self.tier = None
        self.found = None

    def err(self, code, msg):
        self.issues.append(Issue('E', code, msg))

    def warn(self, code, msg):
        self.issues.append(Issue('W', code, msg))

    @property
    def ok(self):
        return not any(i.level == 'E' for i in self.issues)

    def as_dict(self):
        return {'id': self.id, 'group': self.group, 'line': self.line, 'tier': self.tier, 'ok': self.ok, 'issues': [i.as_dict() for i in self.issues]}


def load_groups(cfg):
    if not os.path.exists(cfg.groups):
        raise SystemExit('groups.json not found: %s' % cfg.groups)
    d = json.load(open(cfg.groups, encoding='utf-8'))
    return {g['id']: g for g in d['groups']}


def read_rows(path):
    """(rows, problems): rows are (line number, object); problems are (line number, text)."""
    rows, problems = [], []
    with open(path, encoding='utf-8') as f:
        for n, line in enumerate(f, 1):
            if not line.strip():
                continue
            try:
                o = json.loads(line)
            except Exception as e:
                problems.append((n, 'not valid JSON: %s' % e))
                continue
            if not isinstance(o, dict):
                problems.append((n, 'a row must be a JSON object'))
                continue
            rows.append((n, o))
    return rows, problems


class Context:
    def __init__(self, cfg, rate=DEFAULT_RATE):
        self.cfg = cfg
        self.rate = rate
        self.groups = load_groups(cfg)
        self.sources = Sources(cfg)
        self.store = TextStore()
        self.clip_names = self._clips()
        self.repo_ids = self._repo_ids()
        self.index = {}    # row id -> (group, row object) over every group file, parsed only
        self._load_index()

    def _clips(self):
        if not self.cfg.clips or not os.path.exists(self.cfg.clips):
            return None
        try:
            d = json.load(open(self.cfg.clips, encoding='utf-8'))
            c = d.get('clips', d)
            names = list(c.keys()) if isinstance(c, dict) else [x.get('id') or x.get('name') for x in c]
            return {n.split('~')[0] for n in names if n}
        except Exception:
            return None

    def _repo_ids(self):
        ids = set()
        for p in self.cfg.repo_ids_files:
            if os.path.exists(p):
                ids.update(re.findall(r'"((?:bld|FEN|RD|ENV|WS|GZ|H|P|G|E|S|STR)-[A-Za-z0-9_#-]+)"', open(p, encoding='utf-8', errors='replace').read()))
        return ids | {i.split('#')[0] for i in ids}

    def _load_index(self):
        for gid in self.groups:
            p = os.path.join(self.cfg.evid, gid + '.jsonl')
            if os.path.exists(p):
                rows, _ = read_rows(p)
                for _, o in rows:
                    if isinstance(o.get('id'), str):
                        self.index.setdefault(o['id'], (gid, o))


def _nums_ok(claim_nums, allowed, exempt):
    missing = []
    for n in claim_nums:
        if n in exempt:
            continue
        if not any(abs(n - a) < 1e-9 for a in allowed):
            missing.append(n)
    return missing


def _fmt(n):
    return str(int(n)) if float(n).is_integer() else str(n)


def _strings(o, skip=()):
    """Every string of a nested object (for the copy check), with the key path."""
    if isinstance(o, str):
        yield '', o
    elif isinstance(o, dict):
        for k, v in o.items():
            if k in skip:
                continue
            for p, s in _strings(v, skip):
                yield (k + ('.' + p if p else '')), s
    elif isinstance(o, list):
        for i, v in enumerate(o):
            for p, s in _strings(v, skip):
                yield ('[%d]' % i + ('.' + p if p else '')), s


def validate_row(ctx, gid, line, row, seen_ids, text_cache_rate=None):
    rid = row.get('id') if isinstance(row.get('id'), str) else '(line %d)' % line
    R = RowResult(rid, gid, line)
    grp = ctx.groups.get(gid)
    # ---- identity ------------------------------------------------------------------------------------------------------------------
    m = ID_RE.match(rid) if isinstance(row.get('id'), str) else None
    if not m:
        R.err('E003', 'id must look like med.<group>.<nnn> (lowercase letters, digits, hyphens; 3 to 5 digits)')
    else:
        if m.group(1) != gid:
            R.err('E003', 'the group in the id (%s) is not the group of the file (%s)' % (m.group(1), gid))
        if rid in seen_ids:
            R.err('E003', 'duplicate id (also on line %d)' % seen_ids[rid])
        seen_ids.setdefault(rid, line)
        other = ctx.index.get(rid)
        if other and other[0] != gid:
            R.err('E003', 'the id is also used in the group %s' % other[0])
    if row.get('group') != gid:
        R.err('E004', 'field group must be %r' % gid)
    tier = row.get('tier')
    R.tier = tier
    if tier not in TIERS:
        R.err('E007', 'tier must be one of %s' % ', '.join(TIERS))
    # ---- topic and kind ------------------------------------------------------------------------------------------------------------
    topic = row.get('topic')
    if not isinstance(topic, str) or not TOPIC_RE.match(topic):
        R.err('E005', 'topic must be lowercase dotted words (for example amputation.circular)')
    elif grp and topic.split('.')[0] not in grp.get('topics', []) and topic.split('.')[0] != 'misc':
        R.err('E005', 'topic %r does not start with a topic of the group (%s, or misc)' % (topic, ', '.join(grp.get('topics', []))))
    kind = row.get('kind')
    spec = KINDS.get(kind)
    if spec is None:
        R.err('E006', 'kind must be one of %s' % ', '.join(KINDS))
    elif grp and grp.get('kinds') and kind not in grp['kinds']:
        R.warn('W007', 'kind %s is not among the kinds listed for this group (%s)' % (kind, ', '.join(grp['kinds'])))
    data = row.get('data')
    if spec is not None:
        if not isinstance(data, dict):
            if spec['req']:
                R.err('E006', 'data must be an object with %s' % ', '.join(spec['req']))
            data = {}
        else:
            for k in spec['req']:
                v = data.get(k)
                if v is None or v == '' or v == []:
                    R.err('E006', 'data.%s is required for kind %s' % (k, kind))
            for k, allowed in (spec.get('enums') or {}).items():
                if k in data and data[k] not in allowed:
                    R.err('E006', 'data.%s must be one of %s' % (k, ', '.join(allowed)))
            for k in spec.get('ints', []):
                if k in data and not (isinstance(data[k], int) and not isinstance(data[k], bool) and data[k] >= 1):
                    R.err('E006', 'data.%s must be an integer of at least 1' % k)
            for k in spec.get('site_ids', []):
                if isinstance(data.get(k), str) and not re.match(SITE_ID, data[k]):
                    R.err('E006', 'data.%s must look like site.<slug> (lowercase letters, digits, hyphens)' % k)
        if spec.get('value') and not isinstance(row.get('value'), dict):
            R.err('E021', 'kind %s needs a value object' % kind)
        if spec.get('date') and not isinstance(row.get('date_scope'), dict):
            R.err('E020', 'kind %s needs a date_scope object' % kind)
    # ---- claim ---------------------------------------------------------------------------------------------------------------------
    claim = row.get('claim')
    if not isinstance(claim, str) or not 20 <= len(claim.strip()) <= 500:
        R.err('E002', 'claim must be a sentence of 20 to 500 characters stating exactly what the quote supports')
        claim = claim if isinstance(claim, str) else ''
    # ---- value, dates, sites -------------------------------------------------------------------------------------------------------
    value = row.get('value')
    value_nums = []
    vb = row.get('value_basis')
    if value is not None:
        if not isinstance(value, dict) or value.get('kind') not in ('number', 'range', 'count', 'fraction', 'text', 'date', 'list'):
            R.err('E021', 'value must be an object with kind number, range, count, fraction, text, date or list')
        else:
            k = value['kind']
            if k in ('number', 'count', 'fraction'):
                if not isinstance(value.get('value'), (int, float)) or isinstance(value.get('value'), bool):
                    R.err('E021', 'value.value must be a number')
                else:
                    value_nums.append(float(value['value']))
            elif k == 'range':
                lo, hi = value.get('min'), value.get('max')
                if not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in (lo, hi)) or lo > hi:
                    R.err('E021', 'a range needs numbers min <= max')
                else:
                    value_nums += [float(lo), float(hi)]
            elif k == 'text' and not (isinstance(value.get('text'), str) and value['text'].strip()):
                R.err('E021', 'a text value needs value.text')
            if k in ('number', 'range', 'count', 'fraction') and not (isinstance(value.get('unit'), str) and value['unit'].strip()):
                R.err('E021', 'a number or range needs its unit (value.unit)')
        if vb not in ('stated', 'stated-range', 'computed', 'sum', 'ratio', 'read-from-table', 'estimated'):
            R.err('E021', 'value_basis must be stated, stated-range, computed, sum, ratio, read-from-table or estimated')
        if vb in ('computed', 'sum', 'ratio', 'estimated') and tier == 'documented':
            R.err('E021', 'a %s value cannot be a documented row: the source does not state it (use inferred and name the basis rows)' % vb)
    ds = row.get('date_scope')
    years = set()
    if ds is not None:
        if not isinstance(ds, dict):
            R.err('E020', 'date_scope must be an object')
        else:
            f, t = ds.get('from'), ds.get('to')
            if not (isinstance(f, str) and DATE_RE.match(f)) or (t is not None and not (isinstance(t, str) and DATE_RE.match(t))):
                R.err('E020', 'date_scope.from and .to must be yyyy, yyyy-mm-dd or yyyy-mm-ddThh:mm (local time as printed)')
            else:
                if t is not None and t < f:
                    R.err('E020', 'date_scope.to is before date_scope.from')
                years.update(float(x[:4]) for x in (f, t) if x)
    for sid in row.get('site', []) if isinstance(row.get('site'), list) else []:
        if isinstance(sid, str) and re.match(r'^(H-\d\d|bld-[A-Za-z0-9_#-]+)$', sid) and ctx.repo_ids and sid not in ctx.repo_ids:
            R.err('E006', 'site id %s is not a record of this repository' % sid)
        elif not isinstance(sid, str):
            R.err('E006', 'site must be a list of id strings')
    # ---- source ----------------------------------------------------------------------------------------------------------------------
    ref = row.get('source')
    info = key = path = f = None
    if not isinstance(ref, dict) or not isinstance(ref.get('id'), str) or not isinstance(ref.get('edition'), str) or len(ref['edition'].strip()) < 4:
        R.err('E008', 'source must be an object with id and edition (the edition statement of the printing quoted)')
    else:
        try:
            info, key, path, f = ctx.sources.resolve(ref)
        except KeyError as e:
            R.err('E008', str(e.args[0]))
    if info is not None:
        if info.lead and tier != 'open gap':
            R.err('E019', 'source %s is a lead source (%s): it can support only an open gap row' % (info.id, info.cls))
        if tier == 'documented' and info.cls in NO_DOCUMENTED_CLASSES:
            R.err('E019', 'source class %s cannot support a documented row (inferred at most)' % info.cls)
    # ---- page --------------------------------------------------------------------------------------------------------------------------
    page = row.get('page')
    if not isinstance(page, str) or not PAGE_RE.match(page.strip().lower()):
        R.err('E002', 'page must be a printed page (195, 154-155, xiv), pdf:<page index> or n/a')
        page = ''
    # ---- quote ---------------------------------------------------------------------------------------------------------------------------
    quote = row.get('quote')
    need_quote = tier in ('documented', 'inferred')
    has_quote = isinstance(quote, str) and quote.strip() != ''
    if need_quote and not has_quote:
        R.err('E009', 'a %s row needs a verbatim quote' % tier)
    if has_quote and len(quote) > MAX_QUOTE_CHARS:
        R.err('E009', 'quote longer than %d characters: quote the shortest passage that carries the claim' % MAX_QUOTE_CHARS)
        has_quote = False
    quote_nums = []
    corr = (row.get('ocr') or {}).get('corrections') if isinstance(row.get('ocr'), dict) else None
    reading = quote if has_quote else ''
    if corr is not None:
        if not isinstance(corr, list) or not corr:
            R.err('E022', 'ocr.corrections must be a non-empty list')
        else:
            for c in corr:
                if not (isinstance(c, dict) and isinstance(c.get('from'), str) and isinstance(c.get('to'), str) and c.get('basis') in ('page-image', 'internal-consistency', 'other-copy')):
                    R.err('E022', 'each ocr correction needs from, to and basis (page-image, internal-consistency or other-copy)')
                elif has_quote and c['from'] not in quote:
                    R.err('E022', 'ocr correction %r does not occur in the quote' % c['from'])
                elif c.get('basis') == 'page-image' and not c.get('image'):
                    R.err('E022', 'a page-image correction names the image it was read from (ocr.corrections[].image)')
                elif has_quote:
                    reading = reading.replace(c['from'], c['to'])
            if corr and any(isinstance(c, dict) and c.get('basis') != 'page-image' for c in corr) and tier == 'documented':
                R.warn('W008', 'a documented row with an OCR correction not read from the page image: confirm against the image or lower the tier')
    if has_quote and path is not None and info is not None:
        try:
            rt = ctx.store.get(path, f)
        except KeyError as e:
            R.err('E008', str(e.args[0]))
            rt = None
        if rt is not None:
            near = None
            off = row.get('offset')
            if isinstance(off, dict) and isinstance(off.get('start'), int):
                near = off['start']
            found = find_quote(rt, quote, rate=info.rate if ctx.rate == DEFAULT_RATE else ctx.rate, near=near)
            R.found = found
            if not found.ok:
                R.err('E011' if found.reason.startswith('the digits') or 'inside a number' in found.reason else 'E010', found.reason)
            else:
                if found.dist:
                    R.warn('W001', 'matched with %d edits (%s, view %s): the text differs from the quote by OCR noise' % (found.dist, found.mode, found.view))
                msg = check_number_words(found, quote) if found.dist else None
                if msg:
                    R.err('E011', msg)
                if not isinstance(off, dict) or not isinstance(off.get('start'), int) or not isinstance(off.get('end'), int):
                    R.err('E012', 'offset must be {"start": n, "end": m}, character offsets of the quote in the local file (found %d to %d: use --locate)' % (found.start, found.end))
                elif abs(off['start'] - found.start) > OFFSET_SLACK or abs(off['end'] - found.end) > OFFSET_SLACK:
                    R.err('E012', 'offset %d-%d does not point at the quote (found %d-%d)' % (off['start'], off['end'], found.start, found.end))
                pg, basis = rt.page_hint(found.start)
                if pg is not None and page:
                    pl = page.strip().lower()
                    if rt.page_model == 'marker':
                        if not pl.startswith('pdf:'):
                            R.warn('W002', 'this source has PDF page markers: give the page as pdf:%d (the quote stands on PDF page %d)' % (pg, pg))
                        else:
                            lo = int(pl[4:])
                            pe = rt.page_hint(max(found.start, found.end - 1))[0] or pg
                            if not pg <= lo <= pe:
                                R.err('E012', 'page %s but the quote stands on PDF page %d%s' % (page, pg, '' if pe == pg else ' to %d' % pe))
                    elif re.match(r'^\d+', pl):
                        lo = int(re.match(r'^\d+', pl).group(0))
                        if abs(lo - pg) > 2:
                            R.warn('W002', 'page %s differs from the %s: %d' % (page, basis, pg))
        for p, s in _strings({'q': quote}):
            if COPY_FORBIDDEN.search(s):
                R.warn('W003', 'the quote contains %r, a word the page copy test refuses: show the claim and the source, not the quote' % COPY_FORBIDDEN.search(s).group(0))
    # ---- numbers: the claim and the value may state only numbers of the quote -----------------------------------------------------------
    if (tier in ('documented', 'inferred')) and has_quote:
        allowed = parse_numbers(reading, spaced=True)
        exempt = set(years)
        claim_nums = parse_numbers(claim, skip_lone_one=True)
        # a year of the claim that is 1861-1865 and a day number following a month name belong to date_scope; they are exempt when the row has one
        if ds is not None:
            exempt |= {float(x) for x in range(1861, 1866)}
            claim_nums = [n for n in claim_nums if not (1 <= n <= 31 and re.search(r'(?:Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?\s+%d\b' % int(n), claim))]
        miss = _nums_ok(claim_nums, allowed, exempt)
        if miss:
            R.err('E013', 'the claim states %s, which the quote does not (state only the source\'s numbers, or use value_basis computed and tier inferred)' % ', '.join(_fmt(x) for x in miss))
        if vb in ('stated', 'stated-range', 'read-from-table') and value_nums:
            miss = _nums_ok(value_nums, allowed, set())
            if miss:
                R.err('E013', 'the value %s is not a number of the quote' % ', '.join(_fmt(x) for x in miss))
    # ---- tier rules ------------------------------------------------------------------------------------------------------------------------
    basis_rows = row.get('basis_rows')
    if tier == 'inferred':
        if not (isinstance(basis_rows, list) and basis_rows and all(isinstance(x, str) for x in basis_rows)):
            R.err('E014', 'an inferred row needs basis_rows (ids of documented rows it rests on)')
        if not (isinstance(row.get('inference'), str) and len(row['inference'].strip()) >= 30):
            R.err('E014', 'an inferred row needs the inference written out (30 characters or more)')
    if isinstance(basis_rows, list):
        for b in basis_rows:
            o = ctx.index.get(b)
            if b == rid:
                R.err('E014', 'a row cannot be its own basis')
            elif o is None:
                R.err('E014', 'basis row %s does not exist' % b)
            elif o[1].get('tier') not in ('documented', 'inferred') and tier == 'inferred':
                R.err('E014', 'basis row %s is %s: an inferred row rests on documented or inferred rows' % (b, o[1].get('tier')))
    if tier == 'plausible-procedural' and not (isinstance(row.get('basis'), str) and len(row['basis'].strip()) >= 20):
        R.err('E015', 'a plausible-procedural row needs its basis written (basis, 20 characters or more): what the procedure follows and what is chosen')
    if tier == 'open gap':
        g = row.get('gap')
        if not (isinstance(g, dict) and isinstance(g.get('needed'), str) and len(g['needed'].strip()) >= 20):
            R.err('E015', 'an open gap row needs gap.needed (what source would close it, 20 characters or more)')
    # ---- conflicts ----------------------------------------------------------------------------------------------------------------------
    cf = row.get('conflicts')
    if cf is not None:
        if not isinstance(cf, list):
            R.err('E016', 'conflicts must be a list')
        else:
            for c in cf:
                if not (isinstance(c, dict) and isinstance(c.get('with'), str) and c.get('kind') in ('number', 'date', 'practice', 'identity', 'sequence', 'place', 'other')):
                    R.err('E016', 'each conflict needs with (a row id) and kind (number, date, practice, identity, sequence, place, other)')
                elif c['with'] == rid or c['with'] not in ctx.index:
                    R.err('E016', 'conflict row %s does not exist or is this row' % c['with'])
    if row.get('conflict_set') is not None and not (isinstance(row['conflict_set'], str) and re.match(r'^cs\.[a-z0-9]+(?:[.-][a-z0-9]+)*$', row['conflict_set'])):
        R.err('E016', 'conflict_set must look like cs.<name> (lowercase)')
    # ---- scene ---------------------------------------------------------------------------------------------------------------------------
    sc = row.get('scene')
    if not isinstance(sc, dict) or sc.get('use') not in ('show', 'context', 'none'):
        R.err('E017', 'scene must be an object with use: show, context or none')
    else:
        if sc['use'] == 'show':
            if not (isinstance(sc.get('may_show'), str) and len(sc['may_show'].strip()) >= 20):
                R.err('E017', 'scene.may_show (20 characters or more) says what a scene may show because of this row')
            if sc.get('min_setting') not in ('reduced', 'documentary'):
                R.err('E017', 'scene.min_setting must be reduced or documentary (the lowest Graphic detail setting that shows it)')
            elif sc['min_setting'] == 'documentary' and not (isinstance(sc.get('reduced_form'), str) and sc['reduced_form'].strip()):
                R.err('E017', 'scene.reduced_form says what the Reduced setting shows instead (or the word omit)')
            if tier in ('plausible-procedural', 'open gap') and sc.get('marked') is not True:
                R.err('E017', 'a %s row must set scene.marked true: the scene shows the tier mark or the gap marker' % tier)
        for c in sc.get('clips', []) if isinstance(sc.get('clips'), list) else []:
            if ctx.clip_names is not None and c.split('~')[0] not in ctx.clip_names:
                R.err('E017', 'clip %r is not in data/anim3d/clips.json' % c)
        for p in sc.get('props', []) if isinstance(sc.get('props'), list) else []:
            if not (isinstance(p, str) and re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', p)):
                R.err('E017', 'props are lowercase slugs (litter, operating-table, hospital-tent)')
    # ---- the words the page's copy test refuses, in everything that may be shipped ---------------------------------------------------
    shipped = {k: row.get(k) for k in ('topic', 'claim', 'value', 'date_scope', 'data', 'scene', 'site')}
    for p, s in _strings(shipped):
        mm = COPY_FORBIDDEN.search(s)
        if mm:
            R.err('E018', 'the field %s contains %r, which the page copy test refuses: reword it (period words belong in the quote)' % (p or '?', mm.group(0)))
    if info is not None and tier == 'documented' and row.get('lead'):
        R.err('E019', 'a row marked lead cannot be documented')
    return R


def finish_cross(results, ctx):
    """Rows whose basis rows failed, and conflict sets with a single row (only meaningful when every group is validated).
    A second row with an id already used is a duplicate: it fails by itself and never counts as the row of that id."""
    first = {}
    for r in results:
        first.setdefault(r.id, r)
    failed = {rid for rid, r in first.items() if not r.ok}
    rows = {rid: (r, ctx.index[rid][1]) for rid, r in first.items() if rid in ctx.index}
    changed = True
    while changed:
        changed = False
        for rid, (r, o) in rows.items():
            if r.ok and isinstance(o.get('basis_rows'), list) and any(b in failed for b in o['basis_rows']):
                r.err('E014', 'a basis row failed validation (%s)' % ', '.join(b for b in o['basis_rows'] if b in failed))
                failed.add(rid)
                changed = True
    sets = {}
    for rid, (r, o) in rows.items():
        if o.get('conflict_set'):
            sets.setdefault(o['conflict_set'], []).append(rid)
    for cs, ids in sets.items():
        if len(ids) < 2:
            rows[ids[0]][0].err('E016', 'conflict set %s has one row: a conflict needs at least two readings' % cs)


def validate_group(ctx, gid):
    path = os.path.join(ctx.cfg.evid, gid + '.jsonl')
    out = {'group': gid, 'file': path, 'exists': os.path.exists(path), 'rows': [], 'file_problems': []}
    if not out['exists']:
        return out
    rows, problems = read_rows(path)
    out['file_problems'] = problems
    seen = {}
    # rows on the same file are checked together so that the text is read once
    order = sorted(rows, key=lambda t: ((t[1].get('source') or {}).get('id') if isinstance(t[1].get('source'), dict) else '', t[0]))
    res = {}
    for line, row in order:
        res[line] = validate_row(ctx, gid, line, row, seen)
    out['rows'] = [res[l] for l, _ in rows]
    return out


# ------------------------------------------------------------------------------------------------------------------------------------------
# Reports
# ------------------------------------------------------------------------------------------------------------------------------------------
def print_report(reports, verbose=False, out=sys.stdout):
    nrows = nfail = 0
    for rep in reports:
        gid = rep['group']
        if not rep['exists']:
            print('WARN %s: no evidence file yet (%s)' % (gid, os.path.relpath(rep['file'], ROOT) if rep['file'].startswith(ROOT) else rep['file']), file=out)
            continue
        for line, msg in rep['file_problems']:
            print('FAIL %s line %d: %s' % (gid, line, msg), file=out)
        bad = [r for r in rep['rows'] if not r.ok]
        nrows += len(rep['rows'])
        nfail += len(bad) + len(rep['file_problems'])
        for r in rep['rows']:
            if not r.ok:
                print('FAIL %s (line %d)' % (r.id, r.line), file=out)
                for i in r.issues:
                    if i.level == 'E' or verbose:
                        print('   %s %s %s' % (i.level, i.code, i.msg), file=out)
            elif verbose:
                print('ok   %s (%s)' % (r.id, r.tier), file=out)
                for i in r.issues:
                    print('   %s %s %s' % (i.level, i.code, i.msg), file=out)
        print('%s: %d rows, %d failed' % (gid, len(rep['rows']), len(bad) + len(rep['file_problems'])), file=out)
    return nrows, nfail


def summary(reports):
    lines = ['%-28s %5s %5s %5s %5s %5s %5s' % ('group', 'rows', 'doc', 'inf', 'proc', 'gap', 'fail')]
    tot = [0] * 6
    for rep in reports:
        rs = rep['rows']
        c = [len(rs)] + [sum(1 for r in rs if r.tier == t and r.ok) for t in TIERS] + [sum(1 for r in rs if not r.ok)]
        tot = [a + b for a, b in zip(tot, c)]
        lines.append('%-28s %5d %5d %5d %5d %5d %5d' % ((rep['group'],) + tuple(c)))
    lines.append('%-28s %5d %5d %5d %5d %5d %5d' % (('all',) + tuple(tot)))
    return '\n'.join(lines)


def check_sources(cfg):
    src = Sources(cfg)
    bad = list(src.problems)
    n_local = n_plan = 0
    for sid, s in sorted(src.by_id.items()):
        for key, f in s.files.items():
            if not f.get('path'):
                continue
            p = f['path'] if os.path.isabs(f['path']) else os.path.join(cfg.root, f['path'])
            if not os.path.exists(p):
                n_plan += 1
                continue
            n_local += 1
            if not f.get('sha256'):
                bad.append('%s/%s: local file %s has no sha256 in the registry or the ledger' % (sid, key, f['path']))
            elif sha256_file(p) != f['sha256']:
                bad.append('%s/%s: sha256 of %s differs from the recorded one' % (sid, key, f['path']))
    for b in bad:
        print('FAIL %s' % b)
    print('sources: %d known, %d local files checked, %d planned files not yet local, %d problems' % (len(src.by_id), n_local, n_plan, len(bad)))
    return 1 if bad else 0


def cmd_locate(cfg, sid, quote, key, near, rate):
    src = Sources(cfg)
    try:
        s, k, path, f = src.resolve({'id': sid, 'file': key})
        rt = TextStore().get(path, f)
    except KeyError as e:
        print('FAIL %s' % e.args[0])
        return 1
    fd = find_quote(rt, quote, rate=rate if rate != DEFAULT_RATE else s.rate, near=near)
    if not fd.ok:
        print('FAIL %s' % fd.reason)
        return 1
    pg, basis = rt.page_hint(fd.start)
    print(json.dumps({'source': {'id': sid, 'file': k}, 'offset': {'start': fd.start, 'end': fd.end}, 'mode': fd.mode, 'edits': fd.dist, 'view': fd.view,
                      'segments': fd.segs, 'page_hint': pg, 'page_hint_basis': basis, 'file_path': f['path']}, indent=1))
    return 0


# ------------------------------------------------------------------------------------------------------------------------------------------
# Self-test: synthetic texts in a temporary folder; nothing of the repository is read or written
# ------------------------------------------------------------------------------------------------------------------------------------------
SYN_PARAS = [
    'The Ambulance Corps of the imaginary army carried fourteen thousand one hundred and ninety-three men to the hospitals, and 14,193 is the figure printed in the table. Twelve ambulances waited at the depot.',
    'The surgeon in charge laid the limb upon a table of boards, and the assistant held it while the operator cut the flap with a long knife; no other plan was followed in the barn.',
    'On the march- ing day the tents were left behind and the wounded lay under the open sky until the wagons came up on the fifth of the month in the evening.',
    'In the yard of the farm the wounded numbered 14,l93 on that day, as the clerk wrote it, and tbe orderly brought water in a bucket from the spring near the road.',
    'The steward kept the stores in a chest with two locks, and the chloroform was given on a folded towel by the assistant who stood at the head of the table through the whole of the operation.',
    'About twenty-five wagons stood in the lane, and a sergeant counted twenty five men at the pump; the hospital was set up near the creek because the water was good there.',
    'The farm served as a field hospital from July 2 until the morning of July 5.9 The barn was full of the wounded and the yard held the tents of the surgeons.',
]
SYN_BORING = ['Nothing in this line matters to the test.', 'A line of filler that goes on for a while so that pages have some length to them and pages fill up.']


def make_synthetic_text(pages=14):
    out = ['A SYNTHETIC BOOK OF THE SELF-TEST', '', 'PREFACE.', '']
    for p in range(100, 100 + pages):
        if p % 2 == 0:
            out.append('%d MEDICAL RECOLLECTIONS OF' % p)
        else:
            out.append('THE ARMY OF THE POTOMAC. %d' % p)
        out.append('')
        if p - 100 < len(SYN_PARAS):
            para = SYN_PARAS[p - 100] + ' ' + SYN_BORING[p % 2]
        else:
            para = 'Filler of page %d: %s' % (p, SYN_BORING[p % 2] + ' ' + SYN_BORING[(p + 1) % 2])
        words, line = para.split(' '), ''
        for w in words:
            if len(line) + len(w) + 1 > 52:
                out.append(line)
                line = w
            else:
                line = (line + '  ' + w) if line and p % 3 == 0 else ((line + ' ' + w) if line else w)
        out.append(line)
        out.append('')
    # a sentence that crosses a page break with the running heads in the middle of it
    out += ['the surgeon carried the splint across the lane and laid it on the', '', '115 MEDICAL RECOLLECTIONS OF', '', 'bed of straw beside the wounded man whom the nurse had washed.', '']
    return '\n'.join(out)


class SelfTest:
    def __init__(self):
        self.fail = []
        self.n = 0

    def check(self, name, cond, detail=''):
        self.n += 1
        if not cond:
            self.fail.append('%s %s' % (name, detail))

    def run(self):
        t0 = time.time()
        self._units()
        self._cases()
        print('self-test: %d checks, %d failed (%.1f s)%s' % (self.n, len(self.fail), time.time() - t0, '' if np is not None else ' [pure-python path, numpy not installed]'))
        for f in self.fail:
            print('  FAILED ' + f)
        return 1 if self.fail else 0

    # ---- units -----------------------------------------------------------------------------------------------------------------------
    def _units(self):
        c = self.check
        c('fold', fold('Mar-\nching, the “Ambulance” ſtore 14,193!') == 'marchingtheambulancestore14193', fold('Mar-\nching, the “Ambulance” ſtore 14,193!'))
        c('fold accents', fold('Café ﬁne') == 'cafefne', fold('Café ﬁne'))
        rnd = random.Random(7)
        alpha = 'abcd'
        for i in range(300):
            pat = ''.join(rnd.choice(alpha) for _ in range(rnd.randint(1, 9)))
            txt = ''.join(rnd.choice(alpha) for _ in range(rnd.randint(0, 30)))
            for anch in (False, True):
                a, b = myers_search(pat, txt, anch), dp_search(pat, txt, anch)
                if a[0] != b[0] or (txt and a != b):
                    c('myers vs dp', False, '%r %r anchored=%s myers=%s dp=%s' % (pat, txt, anch, a, b))
                    break
        c('myers vs dp', True)
        c('numbers digits', parse_numbers('the 14,193 wounded and 6,802 of the enemy; 12.5 per cent') == [14193.0, 6802.0, 12.5], str(parse_numbers('the 14,193 wounded and 6,802 of the enemy; 12.5 per cent')))
        c('numbers spaced by OCR', 1995.0 in parse_numbers('remaining on 22d instant 1, 995 Total', spaced=True) and 1995.0 not in parse_numbers('remaining on 22d instant 1, 995 Total'))
        c('numbers words', parse_numbers('fourteen thousand one hundred and ninety-three') == [14193.0], str(parse_numbers('fourteen thousand one hundred and ninety-three')))
        c('numbers words 2', parse_numbers('six hundred and fifty medical officers; twenty-five wagons; twentyfive') == [650.0, 25.0, 25.0], str(parse_numbers('six hundred and fifty medical officers; twenty-five wagons; twentyfive')))
        c('numbers lone one', parse_numbers('no one came', skip_lone_one=True) == [] and parse_numbers('one hundred wagons', skip_lone_one=True) == [100.0])
        c('number tokens', number_tokens('twenty-\nfive men and twentyfive more, one hundred') == ['twenty', 'five', 'twenty', 'five', 'one', 'hundred'], str(number_tokens('twenty-\nfive men and twentyfive more, one hundred')))
        # views: the numpy path and the pure-python path agree, on accents, ligatures and characters above the basic plane
        odd = 'Café ﬁne naïve \U0001F600 ſtore Æther 14,193\r\nline-\nbreak' * 3
        va = build_view(odd, [(5, 9)])
        saved = globals()['np']
        globals()['np'] = None
        try:
            vb = build_view(odd, [(5, 9)])
        finally:
            globals()['np'] = saved
        c('views agree between numpy and python', va.s == vb.s and [int(x) for x in va.offs] == [int(x) for x in vb.offs], '%r %r' % (va.s[:40], vb.s[:40]))
        # approximate location: random quotes with up to 4 % edits are found where they stand; a passage of another text is not found
        rnd = random.Random(11)
        vocab = [''.join(rnd.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(rnd.randint(3, 9))) for _ in range(1500)]
        big = ' '.join(rnd.choice(vocab) for _ in range(40000))
        other = ' '.join(rnd.choice(vocab) for _ in range(400))
        bv = build_view(big)
        lost = wrong = 0
        for trial in range(80):
            a = rnd.randint(0, len(bv.s) - 600)
            L = rnd.randint(40, 400)
            q = list(bv.s[a:a + L])
            nerr = rnd.randint(0, max_err_for(L, 0.04))
            for _ in range(nerr):
                k = rnd.randrange(len(q))
                op = rnd.choice('sdi')
                if op == 's':
                    q[k] = rnd.choice('abcdefghijklmnopqrstuvwxyz')
                elif op == 'd' and len(q) > 30:
                    del q[k]
                else:
                    q.insert(k, rnd.choice('abcdefghijklmnopqrstuvwxyz'))
            cands = locate(bv.s, ''.join(q), max_err_for(L, 0.04))  # the tolerance of the unedited length: deletions shrink the quote
            if not cands:
                lost += 1
            elif abs(cands[0][0] - a) > nerr + 2:
                wrong += 1
        c('locate finds edited quotes', lost == 0 and wrong == 0, 'lost %d wrong %d of 80' % (lost, wrong))
        ov = build_view(other)
        absent = sum(1 for k in range(40) if locate(bv.s, ov.s[k * 50:k * 50 + 120], 4))
        c('locate does not find another text', absent == 0, '%d of 40 found' % absent)
        txt = make_synthetic_text()
        heads = detect_heads(txt)
        c('heads found', len(heads) >= 12, str(len(heads)))
        c('heads numbers', any(n == 101 for _, _, n, _ in heads) and any(n == 113 for _, _, n, _ in heads) and any(n == 115 for _, _, n, _ in heads))
        hp = dict((a, pg) for a, pg in head_pages(heads))
        i_off = txt.index('bed of straw beside')
        rt_syn = type('T', (), {})()
        c('head pages interpolate', max(pg for a, pg in hp.items()) >= 113, str(sorted(hp.items())[-3:]))
        # a head whose OCR spelling differs and whose number is unreadable still counts as a head
        t2 = '\n'.join(['%d MEDICAL RECOLLECTIONS OF\n\nbody %d line here and there\n' % (100 + 2 * k, k) for k in range(6)] + ['MEDICAL KECOLLECTIONS OF\n\nanother body line'])
        c('ocr variant of a head', len(detect_heads(t2)) == 7, str(len(detect_heads(t2))))
        ledger = '| date | source id | class | lead | edition | local path | sha256 | bytes | rights | url | group |\n|---|---|---|---|---|---|---|---|---|---|---|\n| 2026-11-14 | X-1 | period-manual | no | 1st ed. | a/b.txt | ' + 'a' * 64 + ' | 10 | pd | u | g |\ntext | not | a | row |\n'
        rows = parse_ledger(ledger)
        c('ledger parse', len(rows) == 1 and rows[0]['source id'] == 'X-1' and rows[0]['sha256'] == 'a' * 64, str(rows))
        c('copy words', bool(COPY_FORBIDDEN.search('an agent of the page')) and not COPY_FORBIDDEN.search('agents of the Sanitary Commission') and bool(COPY_FORBIDDEN.search('Verified by')))

    # ---- row cases -------------------------------------------------------------------------------------------------------------------
    def _cases(self):
        tmp = tempfile.mkdtemp(prefix='medical-selftest-')
        try:
            self._cases_in(tmp)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def _cases_in(self, tmp):
        c = self.check
        corpus_dir = os.path.join(tmp, 'tmp', 'library', 'medical', 'SYN-BOOK-1')
        os.makedirs(corpus_dir)
        text = make_synthetic_text()
        book = os.path.join(corpus_dir, 'book.txt')
        with open(book, 'w', encoding='utf-8', newline='') as fh:
            fh.write(text)
        lead = os.path.join(tmp, 'tmp', 'library', 'medical', 'SYN-LEAD-1')
        os.makedirs(lead)
        with open(os.path.join(lead, 'lead.txt'), 'w', encoding='utf-8') as fh:
            fh.write(text)
        notes = os.path.join(tmp, 'tmp', 'library', 'medical', 'SYN-NOTES-1')
        os.makedirs(notes)
        with open(os.path.join(notes, 'notes.txt'), 'w', encoding='utf-8') as fh:
            fh.write(text.replace('\n', '\r\n'))
        med = os.path.join(tmp, 'docs', 'battle-theatre', 'medical')
        evid = os.path.join(med, 'evidence')
        os.makedirs(evid)
        sha = sha256_file(book)
        reg = {'schema': 'medical-sources/1', 'sources': {
            'SYN-BOOK-1': {'class': 'memoir-primary', 'edition': 'Synthetic, 2026', 'files': {'main': {'path': 'tmp/library/medical/SYN-BOOK-1/book.txt', 'sha256': sha, 'page_model': 'heads'}}},
            'SYN-LEAD-1': {'class': 'lead', 'edition': 'Synthetic lead, 2026', 'files': {'main': {'path': 'tmp/library/medical/SYN-LEAD-1/lead.txt', 'sha256': sha256_file(os.path.join(lead, 'lead.txt'))}}},
            'SYN-SECONDARY-1': {'class': 'reference-secondary', 'edition': 'Synthetic secondary, 2026', 'files': {'main': {'path': 'tmp/library/medical/SYN-BOOK-1/book.txt', 'sha256': sha}}},
            'SYN-PLANNED-1': {'class': 'period-manual', 'edition': 'Synthetic planned, 2026', 'files': {'main': {'path': 'tmp/library/medical/SYN-PLANNED-1/x.txt', 'sha256': None}}},
            'SYN-MULTI-1': {'class': 'period-manual', 'edition': 'Synthetic two files', 'files': {'a': {'path': 'tmp/library/medical/SYN-BOOK-1/book.txt', 'sha256': sha}, 'b': {'path': 'tmp/library/medical/SYN-BOOK-1/book.txt', 'sha256': sha}}},
            'SYN-CRLF-1': {'class': 'period-manual', 'edition': 'Synthetic crlf', 'files': {'main': {'path': 'tmp/library/medical/SYN-NOTES-1/notes.txt', 'sha256': sha256_file(os.path.join(notes, 'notes.txt')), 'page_model': 'heads'}}},
        }}
        json.dump(reg, open(os.path.join(med, 'sources.json'), 'w'))
        # a ledger-only source (the way a group adds one by appending a table row)
        ledger_rows = '| date | source id | class | lead | edition | local path | sha256 | bytes | rights | url | group |\n|---|---|---|---|---|---|---|---|---|---|---|\n' \
                      '| 2026-11-14 | SYN-LEDGER-1 | official-report | no | Synthetic ledger copy | tmp/library/medical/SYN-BOOK-1/book.txt | %s | %d | public domain | https://example.invalid | g1 |\n' % (sha, os.path.getsize(book))
        open(os.path.join(med, 'SOURCES.md'), 'w').write('# SOURCES\n\n' + ledger_rows)
        groups = {'groups': [
            {'id': 'g1', 'title': 'Group one', 'topics': ['org', 'treatment'], 'kinds': ['fact', 'treatment-step', 'site-count', 'treatment']},
            {'id': 'g2', 'title': 'Group two', 'topics': ['site'], 'kinds': ['fact', 'site', 'site-count']}]}
        json.dump(groups, open(os.path.join(evid, 'groups.json'), 'w'))
        json.dump({'clips': {'surgeon_operate': {}, 'surgeon_operate~v1': {}}}, open(os.path.join(tmp, 'clips.json'), 'w'))
        cfg = Config(root=tmp, clips=os.path.join(tmp, 'clips.json'))

        def base(i, quote, kind='fact', claim=None, tier='documented', topic='org.test', page='102', **over):
            rt = RawText(book, 'heads')
            fd = find_quote(rt, quote, near=None)
            off = {'start': fd.start, 'end': fd.end} if fd.ok else {'start': 0, 'end': 10}
            r = {'id': 'med.g1.%03d' % i, 'group': 'g1', 'topic': topic, 'kind': kind, 'claim': claim or 'The text states what the quote says and nothing more than that.',
                 'tier': tier, 'source': {'id': 'SYN-BOOK-1', 'edition': 'Synthetic, 2026'}, 'page': page, 'quote': quote, 'offset': off,
                 'scene': {'use': 'context'}}
            if kind == 'treatment-step':
                r['data'] = {'treatment': 'amputation.flap', 'order': 1, 'action': 'the operator cuts the flap'}
            r.update(over)
            return r

        def run(rows, groupfile='g1'):
            with open(os.path.join(evid, groupfile + '.jsonl'), 'w', encoding='utf-8') as fh:
                for r in rows:
                    fh.write(json.dumps(r) + '\n')
            ctx = Context(cfg)
            rep = validate_group(ctx, groupfile)
            finish_cross(rep['rows'], ctx)
            return rep['rows']

        def codes(r):
            return {i.code for i in r.issues if i.level == 'E'}

        Q1 = 'The surgeon in charge laid the limb upon a table of boards, and the assistant held it while the operator cut the flap with a long knife'
        cases = []   # (name, row, expected error codes)
        i = 0

        def add(name, row, expect):
            cases.append((name, row, set(expect)))

        i += 1; add('exact quote', base(i, Q1, 'treatment-step', 'The operator cut the flap with a long knife while the assistant held the limb.', topic='treatment.flap'), [])
        i += 1; add('whitespace and case', base(i, 'the surgeon  IN CHARGE laid the limb upon a table of boards, and the assistant held it while the operator cut the flap with a long knife', topic='treatment.flap'), [])
        i += 1; add('hyphen at line end', base(i, 'On the marching day the tents were left behind and the wounded lay under the open sky until the wagons came up on the fifth of the month'), [])
        i += 1; add('ocr digit slip refused', base(i, 'the wounded numbered 14,193 on that day, as the clerk wrote it, and the orderly brought water in a bucket from the spring near the road'), ['E011'])
        i += 1; add('ocr word tolerated', base(i, 'and the orderly brought water in a bucket from the spring near the road', claim='The orderly brought water from the spring near the road in a bucket.'), [])
        i += 1; add('digits unchanged exact', base(i, 'and 14,193 is the figure printed in the table', claim='The table prints 14,193 as the figure.'), [])
        i += 1; add('spelled number as digits in claim', base(i, 'carried fourteen thousand one hundred and ninety-three men to the hospitals', claim='The Ambulance Corps carried 14,193 men to the hospitals.'), [])
        i += 1; add('claim number not in quote', base(i, 'carried fourteen thousand one hundred and ninety-three men to the hospitals', claim='The Ambulance Corps carried 15,193 men to the hospitals.'), ['E013'])
        i += 1; add('fabricated quote', base(i, 'The surgeon in charge laid the limb upon a table of silver and the assistant sang while the operator wept over the flap'), ['E010'])
        i += 1; add('changed digit', base(i, 'and 14,193 is the figure printed in the table', claim='The table prints the figure.').copy() | {'quote': 'and 14,198 is the figure printed in the table'}, ['E011'])
        i += 1; add('changed number word', base(i, 'About twenty-five wagons stood in the lane, and a sergeant counted twenty five men at the pump', claim='Wagons stood in the lane.').copy() | {'quote': 'About twenty-six wagons stood in the lane, and a sergeant counted twenty five men at the pump'}, ['E011'])
        i += 1; add('partial number', base(i, 'and 14,193 is the figure printed in the table', claim='The table prints the figure.').copy() | {'quote': '193 is the figure printed in the table. Twelve ambulances waited at the depot'}, ['E011'])
        i += 1; add('footnote mark after a full stop is not a number', base(i, 'The farm served as a field hospital from July 2 until the morning of July 5.'), [])
        i += 1; add('quote ends inside a number (comma and three digits follow)', base(i, 'carried fourteen thousand one hundred and ninety-three men to the hospitals, and 14', claim='The table prints a figure of men.'), ['E011'])
        i += 1; add('crosses running head', base(i, 'the surgeon carried the splint across the lane and laid it on the bed of straw beside the wounded man whom the nurse had washed'), [])
        i += 1; add('ellipsis segments in order', base(i, 'The surgeon in charge laid the limb upon a table of boards ... the operator cut the flap with a long knife'), [])
        i += 1; add('ellipsis segments out of order', base(i, 'the operator cut the flap with a long knife ... The surgeon in charge laid the limb upon a table of boards'), ['E010'])
        i += 1; add('segment too short', base(i, 'The surgeon in charge laid the limb upon a table of boards … long knife'), ['E010'])
        i += 1; add('quote too short', base(i, 'a table of boards'), ['E010'])
        j = i; r = base(i + 1, Q1, 'treatment-step', 'The operator cut the flap with a long knife while the assistant held the limb.', topic='treatment.flap'); i += 1; r['offset'] = {'start': 5, 'end': 90}
        add('wrong offset', r, ['E012'])
        i += 1; r = base(i, Q1, topic='org.x'); r.pop('offset'); add('missing offset', r, ['E012'])
        i += 1; r = base(i, Q1, topic='org.x'); r['offset'] = {'start': r['offset']['start'] + 5, 'end': r['offset']['end'] - 5}; add('offset within slack', r, [])
        i += 1; add('documented without quote', base(i, Q1, tier='documented').copy() | {'quote': ''}, ['E009'])
        i += 1; add('inferred needs basis', base(i, Q1, tier='inferred'), ['E014'])
        i += 1; add('inferred with unknown basis row', base(i, Q1, tier='inferred', basis_rows=['med.g1.999'], inference='The table of boards implies the operation was done in the barn.'), ['E014'])
        i += 1; add('plausible without basis', base(i, Q1, tier='plausible-procedural'), ['E015'])
        i += 1; add('plausible with basis but unmarked scene', base(i, Q1, tier='plausible-procedural', basis='The manual prescribes the sequence; the choice of the table is the builder\'s.', scene={'use': 'show', 'may_show': 'A table of boards in a barn with one operator.', 'min_setting': 'reduced'}), ['E017'])
        i += 1; add('plausible fine', base(i, Q1, tier='plausible-procedural', basis='The manual prescribes the sequence; the choice of the table is the builder\'s.', scene={'use': 'show', 'may_show': 'A table of boards in a barn with one operator.', 'min_setting': 'reduced', 'marked': True}), [])
        i += 1; add('open gap without gap', base(i, Q1, tier='open gap').copy() | {'quote': ''}, ['E015'])
        i += 1; add('open gap fine', base(i, Q1, tier='open gap').copy() | {'quote': '', 'gap': {'needed': 'A surgeon\'s report of the barn that states the number of tables.'}}, [])
        i += 1; r = base(i, Q1); r['source'] = {'id': 'SYN-LEAD-1', 'edition': 'Synthetic lead, 2026'}; add('lead source documented', r, ['E019'])
        i += 1; r = base(i, Q1); r['source'] = {'id': 'SYN-SECONDARY-1', 'edition': 'Synthetic secondary, 2026'}; add('secondary documented', r, ['E019'])
        i += 1; r = base(i, Q1, tier='inferred', basis_rows=['med.g1.001'], inference='The table of boards in the barn implies the operation was done indoors.'); r['source'] = {'id': 'SYN-SECONDARY-1', 'edition': 'Synthetic secondary, 2026'}; add('secondary inferred is fine', r, [])
        i += 1; r = base(i, Q1); r['source'] = {'id': 'SYN-UNKNOWN-9', 'edition': 'x x x x'}; add('unknown source', r, ['E008'])
        i += 1; r = base(i, Q1); r['source'] = {'id': 'SYN-PLANNED-1', 'edition': 'Synthetic planned, 2026'}; add('planned source not local', r, ['E008'])
        i += 1; r = base(i, Q1); r['source'] = {'id': 'SYN-LEDGER-1', 'edition': 'Synthetic ledger copy'}; add('ledger-only source', r, [])
        i += 1; r = base(i, Q1); r['source'] = {'id': 'SYN-MULTI-1', 'edition': 'Synthetic two files'}; add('several files need a key', r, ['E008'])
        i += 1; r = base(i, Q1); r['source'] = {'id': 'SYN-MULTI-1', 'edition': 'Synthetic two files', 'file': 'a'}; add('several files with a key', r, [])
        i += 1; r = base(i, Q1); r['source'] = {'id': 'SYN-BOOK-1'}; add('edition missing', r, ['E008'])
        i += 1; r = base(i, Q1, tier='silver'); add('unknown tier', r, ['E007'])
        i += 1; r = base(i, Q1, topic='finance.x'); add('topic not of the group', r, ['E005'])
        i += 1; r = base(i, Q1, kind='nonsense'); add('unknown kind', r, ['E006'])
        i += 1; r = base(i, Q1, kind='treatment-step'); r['data'] = {'treatment': 'x'}; add('kind data missing', r, ['E006'])
        i += 1; r = base(i, Q1, kind='treatment-step'); r['data']['actor'] = 'wizard'; add('kind enum wrong', r, ['E006'])
        i += 1; r = base(i, Q1, kind='site-count'); r['data'] = {'site_id': 'site.barn-one', 'what': 'patients'}; add('site-count needs value and date', r, ['E021', 'E020'])
        i += 1; r = base(i, 'carried fourteen thousand one hundred and ninety-three men to the hospitals', kind='site-count', claim='The corps carried 14,193 men to the hospitals.',
                         data={'site_id': 'site.barn-one', 'what': 'patients'}, value={'kind': 'number', 'value': 14193, 'unit': 'men'}, value_basis='stated',
                         date_scope={'from': '1863-07-04', 'to': None}); add('site-count fine', r, [])
        i += 1; r = base(i, 'carried fourteen thousand one hundred and ninety-three men to the hospitals', kind='site-count', claim='The corps carried men to the hospitals.',
                         data={'site_id': 'site.barn-one', 'what': 'patients'}, value={'kind': 'number', 'value': 14000, 'unit': 'men'}, value_basis='stated',
                         date_scope={'from': '1863-07-04', 'to': None}); add('value not in quote', r, ['E013'])
        i += 1; r = base(i, 'carried fourteen thousand one hundred and ninety-three men to the hospitals', kind='site-count', claim='The corps carried men to the hospitals.',
                         data={'site_id': 'site.barn-one', 'what': 'patients'}, value={'kind': 'number', 'value': 14000, 'unit': 'men'}, value_basis='computed',
                         date_scope={'from': '1863-07-04', 'to': None}); add('computed value cannot be documented', r, ['E021'])
        i += 1; r = base(i, Q1, date_scope={'from': '1863-07-05', 'to': '1863-07-04'}); add('date order', r, ['E020'])
        i += 1; r = base(i, Q1, date_scope={'from': 'July 5', 'to': None}); add('date format', r, ['E020'])
        i += 1; r = base(i, Q1, value={'kind': 'range', 'min': 5, 'max': 2, 'unit': 'men'}, value_basis='stated'); add('range order', r, ['E021'])
        i += 1; r = base(i, Q1, claim='An agent of the page said the table was of boards in the barn.'); add('copy words in claim', r, ['E018'])
        i += 1; r = base(i, Q1, claim='The text states that the surgeon laid the limb upon a table of boards.', scene={'use': 'show', 'may_show': 'This is a verified table of boards in a barn.', 'min_setting': 'reduced'}); add('copy words in scene', r, ['E018'])
        i += 1; r = base(i, Q1, scene={'use': 'show', 'may_show': 'A table of boards in a barn, one operator, one assistant.', 'min_setting': 'documentary'}); add('documentary needs reduced form', r, ['E017'])
        i += 1; r = base(i, Q1, scene={'use': 'show', 'may_show': 'A table of boards in a barn, one operator, one assistant.', 'min_setting': 'documentary', 'reduced_form': 'omit', 'clips': ['surgeon_operate~v1']}); add('known clip', r, [])
        i += 1; r = base(i, Q1, scene={'use': 'show', 'may_show': 'A table of boards in a barn, one operator, one assistant.', 'min_setting': 'reduced', 'clips': ['sword_dance']}); add('unknown clip', r, ['E017'])
        i += 1; r = base(i, Q1, scene={'use': 'maybe'}); add('scene use', r, ['E017'])
        i += 1; r = base(i, Q1, page='the second page'); add('page format', r, ['E002'])
        i += 1; r = base(i, Q1, id='MED-G1-014'); add('id format', r, ['E003'])
        i += 1; r = base(i, Q1, id='med.g2.014'); add('id group', r, ['E003'])
        i += 1; r = base(i, Q1, ocr={'corrections': [{'from': 'tbe', 'to': 'the', 'basis': 'other-copy'}]}); add('ocr correction not in quote', r, ['E022'])
        i += 1; r = base(i, Q1, ocr={'corrections': [{'from': 'long knife', 'to': 'long knife', 'basis': 'page-image'}]}); add('page-image correction needs image', r, ['E022'])
        i += 1; r = base(i, Q1, conflicts=[{'with': 'med.g1.999', 'kind': 'number'}]); add('conflict with unknown row', r, ['E016'])
        i += 1; r = base(i, Q1, conflict_set='cs.alone'); add('conflict set of one', r, ['E016'])
        i += 1; r = base(i, Q1, extra_field='x'); add('unknown extra field is allowed', r, [])
        # a CRLF text: the offsets are character offsets without newline translation
        i += 1; r = base(i, Q1); r['source'] = {'id': 'SYN-CRLF-1', 'edition': 'Synthetic crlf'}
        rtc = RawText(os.path.join(notes, 'notes.txt'), 'heads'); fdc = find_quote(rtc, Q1)
        r['offset'] = {'start': fdc.start, 'end': fdc.end}; add('crlf text offsets', r, [])
        rows = [r for _, r, _ in cases]
        # duplicate ids: the second of two equal rows fails
        dup = dict(rows[0])
        res = run(rows + [dup])
        for (name, r, expect), got in zip(cases, res):
            c('case: ' + name, codes(got) == expect, 'expected %s got %s: %s' % (sorted(expect), sorted(codes(got)), '; '.join(str(x) for x in got.issues if x.level == 'E')))
        c('case: duplicate id', 'E003' in codes(res[-1]), str(res[-1].issues))
        # the report keeps one result per row and the first of two equal rows stays valid
        c('first of duplicates stays valid', codes(res[0]) == set(), str(res[0].issues))
        # a file that changed after its hash was recorded
        with open(book, 'a', encoding='utf-8', newline='') as fh:
            fh.write('\nA line added after the hash was recorded.\n')
        res = run([base(1, Q1)] if False else [{**cases[0][1]}])
        c('changed file is refused', 'E008' in codes(res[0]), str(res[0].issues))
        # check_sources on the changed file
        import io, contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = check_sources(cfg)
        c('check_sources notices the changed file', rc == 1 and 'differs from the recorded one' in buf.getvalue(), buf.getvalue()[:200])


def build_parser():
    class P(argparse.ArgumentParser):
        def error(self, message):
            self.print_usage(sys.stderr)
            print('error: %s' % message, file=sys.stderr)
            sys.exit(1)
    p = P(description='Check the medical evidence files against the local texts.', add_help=True)
    p.add_argument('group', nargs='?', help='a group id of groups.json')
    p.add_argument('--all', action='store_true', help='every group')
    p.add_argument('--self-test', action='store_true')
    p.add_argument('--list-groups', action='store_true')
    p.add_argument('--check-sources', action='store_true')
    p.add_argument('--locate', nargs=2, metavar=('SOURCE_ID', 'QUOTE'))
    p.add_argument('--file', default=None, help='file key of a source with several files (with --locate)')
    p.add_argument('--near', type=int, default=None, help='prefer the occurrence nearest to this offset (with --locate)')
    p.add_argument('--json', metavar='PATH', default=None)
    p.add_argument('--summary', action='store_true')
    p.add_argument('--rate', type=float, default=DEFAULT_RATE)
    p.add_argument('-v', '--verbose', action='store_true')
    return p


def main(argv=None):
    a = build_parser().parse_args(argv)
    cfg = Config()
    if a.self_test:
        return SelfTest().run()
    if a.list_groups:
        for gid in load_groups(cfg):
            print(gid)
        return 0
    if a.check_sources:
        return check_sources(cfg)
    if a.locate:
        return cmd_locate(cfg, a.locate[0], a.locate[1], a.file, a.near, a.rate)
    if not a.all and not a.group:
        build_parser().error('name a group, or use --all, --self-test, --locate, --check-sources or --list-groups')
    ctx = Context(cfg, rate=a.rate)
    gids = list(ctx.groups) if a.all else [a.group]
    if a.group and a.group not in ctx.groups:
        print('FAIL unknown group %r (groups: %s)' % (a.group, ', '.join(ctx.groups)))
        return 1
    reports = [validate_group(ctx, g) for g in gids]
    if a.all:
        finish_cross([r for rep in reports for r in rep['rows']], ctx)
    for p in ctx.sources.problems:
        print('FAIL sources: %s' % p)
    nrows, nfail = print_report(reports, a.verbose)
    if a.group and not reports[0]['exists']:
        print('FAIL %s: the evidence file does not exist (%s)' % (a.group, reports[0]['file']))
        nfail += 1
    if a.summary:
        print(summary(reports))
    if a.json:
        with open(a.json, 'w', encoding='utf-8') as f:
            json.dump({'schema': 'medical-evidence-report/1', 'rows_total': nrows, 'rows_failed': nfail,
                       'groups': [{'group': r['group'], 'file': r['file'], 'exists': r['exists'], 'file_problems': r['file_problems'],
                                   'rows': [x.as_dict() for x in r['rows']]} for r in reports]}, f, indent=1)
    print('checked %d rows in %d group file(s): %d failed' % (nrows, sum(1 for r in reports if r['exists']), nfail))
    return 1 if (nfail or ctx.sources.problems) else 0


if __name__ == '__main__':
    sys.exit(main())
