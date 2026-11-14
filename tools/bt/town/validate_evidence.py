#!/usr/bin/env python3
"""Validate the building evidence files of the town and buildings pass (OA10): docs/battle-theatre/town/evidence/<group>.jsonl

    python3 tools/bt/town/validate_evidence.py <group>            one group (exit 1 on any failure)
    python3 tools/bt/town/validate_evidence.py --all              every group of evidence/groups.json (a missing file is a failure; --allow-missing skips it)
    python3 tools/bt/town/validate_evidence.py --file F.jsonl     one file whose rows name their own group (used for EXAMPLES.jsonl)
    python3 tools/bt/town/validate_evidence.py <group> --complete every declared building also has a row (an evidence row or an open-gap row) for every required field
    python3 tools/bt/town/validate_evidence.py --check-ledger     every source of SOURCES.md: file present, sha256 equal
    python3 tools/bt/town/validate_evidence.py --schema           print the vocabularies of the contract
    python3 tools/bt/town/validate_evidence.py --self-test        the checks of this program on synthetic and real data

What a row must satisfy is written in docs/battle-theatre/town/evidence/PLAN.md (section 3) and printed by --schema. In short: the quote of a `documented`
or `inferred` row is found, whitespace, punctuation, hyphenation, case and ligature tolerant (or, with quote_mode "ocr", within local character confusions of
a recorded raw excerpt), in the named local text at the recorded offset and page; a `documented` row cites a source that is not a lead; every number of a
numeric value stands in the quote; the tier is one of four; ids are unique; a conflict is written on both rows; an open gap names the searches that failed.
Run it with `python3 -I`; the program reads only local files. Offsets are character offsets into the file decoded as UTF-8 with newline='' (the convention of
tools/bt/or27_lib.py).
"""
import difflib, hashlib, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
REAL_ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

TIERS = ('documented', 'inferred', 'plausible-procedural', 'open gap')
SOURCE_CLASSES = ('primary', 'official', 'book', 'lead')
EVIDENCE_KINDS = ('text', 'image', 'map', 'none')
ROW_TYPES = ('building', 'field', 'search')
DESCRIBES = ('before_1863', 'june_1863', 'july_1863', 'after_battle_to_1869', 'later', 'undated')
DECLARED_FROM = ('structures.json', 'basemap', 'groups.json', 'new')
SEARCH_OUTCOMES = ('found', 'not_found', 'failed', 'blocked', 'not_read')
STATES = ('intact', 'damaged', 'loopholed', 'burned', 'destroyed', 'demolished', 'fortified', 'barricaded', 'hospital', 'aid_station', 'headquarters',
          'observation_post', 'signal_post', 'sniper_post', 'prison', 'occupied', 'abandoned', 'looted', 'fences_removed', 'stripped_for_fuel', 'other')
WINDOWS = ('clock', 'day', 'part_of_day', 'period', 'unknown')
TRANSITIONS = ('instant', 'progressive', 'none')
EXISTS_VALUES = ('stood', 'not_yet_built', 'no_longer_standing', 'unknown')
MATERIALS = ('brick', 'stone', 'granite', 'log', 'frame', 'board_and_batten', 'weatherboard', 'log_weatherboarded', 'stucco', 'plaster', 'iron', 'wood', 'mixed', 'other')
ROOF_FORMS = ('gable', 'hip', 'gambrel', 'shed', 'flat', 'mansard', 'cross_gable', 'lean_to', 'other')
ROOF_MATERIALS = ('wood_shingle', 'slate', 'tin', 'tile', 'thatch', 'board', 'other')
PLACE_METHODS = ('outline_2023', 'warren_plate_symbol', 'hopkins_inset', 'hopkins_county', 'described_offset', 'photograph_view', 'gazetteer_point', 'survey_or_drawing', 'other')
UNITS = ('ft', 'in', 'm', 'yd', 'rods', 'acres', 'miles')
OBSERVABLE_FIELDS = ('kind', 'storeys', 'walls', 'roof', 'porch', 'tower_or_cupola', 'chimneys', 'openings', 'colour', 'state', 'existed_july_1863', 'photograph', 'sign')
MEASURE_FIELDS = ('footprint', 'height', 'place', 'span', 'length', 'width', 'frontage', 'extent')
FIELDS = (
    # identity and existence
    'name', 'existed_july_1863', 'built', 'lost', 'occupant', 'owner', 'use', 'kind', 'identity',
    # place
    'place', 'orientation', 'frontage',
    # form
    'storeys', 'height', 'footprint', 'plan_shape', 'walls', 'roof', 'foundation', 'chimneys', 'openings', 'porch', 'tower_or_cupola', 'colour', 'additions',
    'interior_change', 'outbuildings', 'lot_enclosure', 'orchard_or_garden', 'sign',
    # state over time
    'state',
    # other structures
    'span', 'surface', 'width', 'length', 'fence_type', 'wall_type', 'extent', 'terrain_change',
    # photographs
    'photograph',
)
# numbers of a value that must stand in a quote: field -> keys of the value dict ('' = the value itself)
QUOTED_NUMBER_KEYS = {
    'storeys': [''], 'height': ['value'], 'footprint': ['w', 'd', 'area'], 'span': ['value'], 'length': ['value'], 'width': ['value'],
    'built': ['year', 'value'], 'lost': ['year'], 'state': ['count'], 'additions': ['year'], 'frontage': ['value'], 'chimneys': ['count'], 'openings': ['count'],
    'terrain_change': ['year', 'delta'], 'extent': ['value'],
}
REQUIRED_FIELDS = {   # --complete: every declared building has at least one row (any tier, an open gap included) for each of these
    'building': ('existed_july_1863', 'name', 'occupant', 'place', 'kind', 'storeys', 'footprint', 'walls', 'roof', 'outbuildings', 'state'),
    'bridge': ('existed_july_1863', 'name', 'place', 'kind', 'span', 'walls', 'state'),
    'fence': ('existed_july_1863', 'place', 'fence_type', 'height', 'state'),
    'wall': ('existed_july_1863', 'place', 'wall_type', 'height', 'state'),
    'road': ('existed_july_1863', 'name', 'place', 'surface', 'width'),
    'railway': ('existed_july_1863', 'place', 'surface', 'width', 'state'),
    'terrain': ('terrain_change', 'place', 'extent'),
    'mass': ('existed_july_1863', 'place', 'kind', 'storeys', 'state'),        # a borough mass (STR-BORO-MASS-nnn): the extent of the ink of the Warren plate
    'symbol': ('existed_july_1863', 'place', 'kind', 'occupant'),              # a map symbol (STR-MAPSYM-nnnn, outbuilding points): a point on a plate
}
KIND_PROFILE = {   # value of a `kind` row -> profile of REQUIRED_FIELDS
    'bridge': 'bridge', 'covered_bridge': 'bridge', 'trestle': 'bridge', 'ford': 'bridge', 'culvert': 'bridge',
    'fence': 'fence', 'post_and_rail_fence': 'fence', 'worm_fence': 'fence', 'picket_fence': 'fence', 'iron_fence': 'fence',
    'wall': 'wall', 'stone_wall': 'wall', 'road': 'road', 'turnpike': 'road', 'lane': 'road', 'railway': 'railway', 'rail_grade': 'railway',
    'terrain': 'terrain', 'quarry': 'terrain', 'cut': 'terrain', 'avenue': 'terrain', 'pond': 'terrain',
    'building_mass': 'mass', 'map_symbol': 'symbol',
}
FORM_FIELDS = ('storeys', 'height', 'footprint', 'plan_shape', 'walls', 'roof', 'foundation', 'chimneys', 'openings', 'porch', 'tower_or_cupola', 'colour', 'additions',
               'outbuildings', 'lot_enclosure', 'orchard_or_garden', 'sign', 'span', 'fence_type', 'wall_type', 'width', 'length', 'surface')
CONTINUITY_EXEMPT = ('lost', 'identity', 'photograph', 'built', 'name', 'owner', 'occupant', 'use', 'existed_july_1863')
COMMON_KEYS = {'row', 'type', 'group', 'building', 'note', 'see_also', 'x_reason'}
BUILDING_KEYS = COMMON_KEYS | {'name', 'aliases', 'declared_from', 'links', 'new_reason'}
SEARCH_KEYS = COMMON_KEYS | {'where', 'query', 'outcome', 'at', 'found_rows', 'url'}
FIELD_KEYS = COMMON_KEYS | {'field', 'value', 'tier', 'evidence_kind', 'describes', 'source', 'part', 'page', 'page_note', 'printed_page', 'quote', 'quote_mode', 'raw',
                            'ocr_note', 'page_image_viewed', 'text_offset', 'also', 'continuity', 'image_ref', 'basis', 'premises', 'rule', 'searched', 'conflicts',
                            'derived', 'derivation', 'state', 'from', 'to', 'window', 'transition', 'detail', 'count', 'count_basis', 'hospital_id', 'value_detail',
                            'method', 'error_m'}
CITE_KEYS = {'source', 'part', 'page', 'quote', 'text_offset', 'quote_mode', 'raw', 'ocr_note', 'page_image_viewed', 'printed_page', 'page_note'}
LEDGER_COLUMNS = ('id', 'class', 'title', 'date', 'text', 'sha256', 'pages', 'rights', 'url', 'notes')
MIN_QUOTE_ALNUM = 20
MAX_QUOTE_CHARS = 700
ROW_ID_RE = re.compile(r'^([a-z0-9-]+)\.(\d{4,})$')
TWN_RE = re.compile(r'^TWN-([A-Z]{3})-(\d{4})$')
ISO_RE = re.compile(r'^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$')
BBOX = (-77.42, 39.70, -77.00, 39.95)   # lng_min, lat_min, lng_max, lat_max: the battlefield and its surroundings


class Ctx:
    def __init__(self, root):
        self.root = root
        self.town = os.path.join(root, 'docs', 'battle-theatre', 'town')
        self.evid = os.path.join(self.town, 'evidence')
        self.ledger_path = os.path.join(self.town, 'SOURCES.md')
        self.groups_path = os.path.join(self.evid, 'groups.json')
        self.rules_path = os.path.join(self.evid, 'generic_rules.json')
        self.or27_index = os.path.join(root, 'docs', 'battle-theatre', 'library', 'or27_index.json')
        self.cache_dir = os.path.join(root, 'tmp', 'town', 'validate-cache')
        self._texts = {}
        self._ledger = None
        self._groups = None
        self._rules = None
        self._or27 = None
        self._rows = {}

    # ---- loaders
    def groups(self):
        if self._groups is None:
            with open(self.groups_path, encoding='utf-8') as f:
                d = json.load(f)
            gl = d['groups_list']
            self._groups = {g['id']: g for g in gl}
        return self._groups

    def rules(self):
        if self._rules is None:
            try:
                with open(self.rules_path, encoding='utf-8') as f:
                    self._rules = {r['id']: r for r in json.load(f)['rules']}
            except FileNotFoundError:
                self._rules = {}
        return self._rules

    def ledger(self):
        if self._ledger is None:
            self._ledger = parse_ledger(self.ledger_path)
        return self._ledger

    def families(self):
        if getattr(self, '_fam', None) is None:
            try:
                with open(os.path.join(self.evid, 'ledger-families.json'), encoding='utf-8') as f:
                    self._fam = json.load(f).get('families', {})
            except FileNotFoundError:
                self._fam = {}
        return self._fam

    def or27(self):
        if self._or27 is None:
            try:
                with open(self.or27_index, encoding='utf-8') as f:
                    self._or27 = {r['id']: r for r in json.load(f)['records']}
            except FileNotFoundError:
                self._or27 = {}
        return self._or27

    def text(self, relpath):
        """(raw text, skeleton, offset map, page markers) of a local text file, cached."""
        if relpath not in self._texts:
            p = os.path.join(self.root, relpath)
            with open(p, encoding='utf-8', errors='replace', newline='') as f:
                raw = f.read()
            skel, omap = skeleton(raw)
            marks = [(m.start(), int(m.group(1))) for m in re.finditer(r'^=== PAGE (\d+) ===\s*$', raw, re.M)]
            self._texts[relpath] = (raw, skel, omap, marks)
        return self._texts[relpath]


# ------------------------------------------------------------------------------------------------ text normalisation
_LIG = {'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'st', 'ﬆ': 'st', 'œ': 'oe', 'æ': 'ae',
        'ſ': 's', 'ß': 'ss', 'ø': 'o', 'ł': 'l', 'ı': 'i'}
_TOK = re.compile(r'[a-z0-9]+|[^\x00-\x7f]')


def skeleton(text):
    """Return (skel, omap): the lower-case letters and digits of the text in order, and for every skeleton character the character offset in the original text.

    Everything else (spaces, line breaks, hyphens, quotes, dashes, other punctuation, symbols) is dropped, so a quote matches across line breaks, double spaces,
    a hyphen at the end of a line, different quote marks and case. Ligatures and accented letters are reduced to their plain letters."""
    from array import array
    low = text.lower()
    out = []
    omap = array('i')
    for m in _TOK.finditer(low):
        s = m.group()
        if s[0] < '\x80':
            out.append(s)
            omap.extend(range(m.start(), m.end()))
        else:
            r = _LIG.get(s)
            if r is None:
                d = unicodedata.normalize('NFKD', s)
                r = ''.join(ch for ch in d if ch < '\x80' and ch.isalnum())
            for ch in r:
                out.append(ch)
                omap.append(m.start())
    return ''.join(out), omap


def quote_skeleton(q):
    s, _ = skeleton(q)
    return s


_ELL = re.compile(r'\s*(?:\[\s*\.\.\.\s*\]|\.\.\.|…)\s*')


def fragments(quote):
    """A quote may skip text with [...] (or ... or the ellipsis character); each fragment must be found, in order."""
    return [f for f in _ELL.split(quote) if quote_skeleton(f)]


def find_all(hay, needle, limit=50):
    out, i = [], hay.find(needle)
    while i >= 0 and len(out) < limit:
        out.append(i)
        i = hay.find(needle, i + 1)
    return out


def match_quote(skel, omap, quote, max_gap_alnum=900):
    """Find the quote (with fragments) in the skeleton. Returns a list of start offsets (original text) of every complete match; [] when none."""
    frs = [quote_skeleton(f) for f in fragments(quote)]
    if not frs:
        return []
    starts = []
    for i0 in find_all(skel, frs[0]):
        pos = i0 + len(frs[0])
        ok = True
        for fr in frs[1:]:
            j = skel.find(fr, pos, pos + max_gap_alnum + len(fr))
            if j < 0:
                ok = False
                break
            pos = j + len(fr)
        if ok:
            starts.append(omap[i0])
    return starts


# OCR-mode comparison: the corrected quote against the raw excerpt, within local character confusions
_MULTI = (('rn', 'm'), ('vv', 'w'), ('cl', 'd'), ('ii', 'u'), ('li', 'h'))
_SINGLE = str.maketrans({'0': 'o', '1': 'l', 'i': 'l', 'j': 'l', '5': 's', 'u': 'n', 'e': 'c', 'q': 'g', '8': 'b'})


def fold(s):
    for a, b in _MULTI:
        s = s.replace(a, b)
    return s.translate(_SINGLE)


def ocr_difference(raw_skel, quote_skel):
    """(ok, digit_repair, why): the corrected reading equals the raw excerpt up to local OCR confusions (<= 3 characters on either side of every difference)."""
    if raw_skel == quote_skel:
        return True, False, 'identical'
    sm = difflib.SequenceMatcher(None, raw_skel, quote_skel, autojunk=False)
    digit = False
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        a, b = raw_skel[i1:i2], quote_skel[j1:j2]
        if len(a) > 3 or len(b) > 3:
            return False, False, 'a difference of more than 3 characters (%r versus %r): that is a rewrite, not an OCR repair' % (a[:12], b[:12])
        if fold(a) != fold(b):
            return False, False, 'the difference %r versus %r is not an OCR confusion' % (a, b)
        if any(c.isdigit() for c in a + b):
            digit = True
    return True, digit, 'confusions only'


# ------------------------------------------------------------------------------------------------ numbers
_WORDS = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
          'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60,
          'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100, 'single': 1, 'double': 2, 'half': 0.5}


def number_set(text):
    """The numbers a text states: digit groups (thousands commas dropped), fractions, vulgar halves, number words, 'N and a half'."""
    t = (text or '').lower().replace('½', ' 1/2 ').replace('’', "'")
    nums = set()
    t2 = re.sub(r'(?<=\d),(?=\d{3}(?!\d))', '', t)
    for m in re.finditer(r'\d+(?:\.\d+)?', t2):
        v = float(m.group())
        nums.add(v)
    for m in re.finditer(r'(\d+)\s*/\s*(\d+)', t2):
        if float(m.group(2)):
            nums.add(float(m.group(1)) / float(m.group(2)))
    for m in re.finditer(r'(\d+)\s+(\d+)\s*/\s*(\d+)', t2):
        if float(m.group(3)):
            nums.add(float(m.group(1)) + float(m.group(2)) / float(m.group(3)))
    words = re.findall(r'[a-z]+', t)
    for w in words:
        if w in _WORDS:
            nums.add(float(_WORDS[w]))
    for m in re.finditer(r'\b([a-z]+)[\s-]+(?:and|&)[\s-]+(?:a|one)[\s-]+half\b', t):
        if m.group(1) in _WORDS:
            nums.add(_WORDS[m.group(1)] + 0.5)
    for m in re.finditer(r'\b(\d+)\s+and\s+a\s+half\b', t):
        nums.add(float(m.group(1)) + 0.5)
    if re.search(r'story\s+and\s+a\s+half|one\s+and\s+a\s+half|one\s+and\s+one[\s-]half', t):
        nums.add(1.5)
    for m in re.finditer(r'\b([a-z]+)[\s-]+([a-z]+)\b', t):   # twenty-six
        a, b = _WORDS.get(m.group(1)), _WORDS.get(m.group(2))
        if a and b and a in (20, 30, 40, 50, 60, 70, 80, 90) and b < 10:
            nums.add(float(a + b))
    return nums


def value_numbers(field, value):
    keys = QUOTED_NUMBER_KEYS.get(field)
    if not keys or value is None:
        return []
    out = []
    for k in keys:
        v = value if k == '' else (value.get(k) if isinstance(value, dict) else None)
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            out.append((k or 'value', float(v)))
    return out


# ------------------------------------------------------------------------------------------------ ledger
def parse_ledger(path):
    """Rows of every markdown table of SOURCES.md whose header starts with `id`: {id: {column: cell}} (later rows of the same id are refused)."""
    out = {}
    dup = []
    if not os.path.exists(path):
        return out
    cols = None
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if not line.startswith('|'):
                cols = None if line.strip() == '' else cols
                continue
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if cells and cells[0].lower() == 'id':
                cols = [c.lower() for c in cells]
                continue
            if cols is None or set(cells[0]) <= set('-: ') or len(cells) < len(cols):
                continue
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._{}-]*', cells[0]):
                continue
            row = dict(zip(cols, cells))
            sid = row['id']
            if sid in out and sid != '__duplicates__':
                if out[sid].get('text', '-') in ('-', '', 'none') and row.get('text', '-') not in ('-', '', 'none'):
                    pass            # a planned source (no local text yet) completed by its acquired row
                else:
                    dup.append(sid)
            out[sid] = row
    out['__duplicates__'] = dup
    return out


def resolve_text(ctx, sid, part):
    """Repo-relative path of the local text named by a ledger source (and the part), or (None, why)."""
    led = ctx.ledger().get(sid)
    if led is None:
        return None, 'source %r is not in docs/battle-theatre/town/SOURCES.md' % sid
    t = led.get('text', '')
    if not t or t in ('-', 'none'):
        return None, 'source %r has no local text (ledger text column is empty)' % sid
    if '{part}' in t:
        if not part or not isinstance(part, str):
            return None, 'source %r is a family of texts: the row must name the part' % sid
        if '..' in part or part.startswith('/') or '\\' in part:
            return None, 'part %r is not a plain name' % part
        t = t.replace('{part}', part)
    if '..' in t.split('/') or t.startswith('/'):
        return None, 'ledger path %r leaves the repository' % t
    if not os.path.exists(os.path.join(ctx.root, t)):
        return None, 'local text %s of source %r does not exist' % (t, sid)
    return t, None


# ------------------------------------------------------------------------------------------------ citations
def check_cite(ctx, c, where, errors, warnings, need_class_not_lead=False, numbers_in=None):
    """Verify one citation (source, part, page, quote, text_offset, quote_mode, raw ...). Returns True when the quote was found at the offset."""
    for k in ('source', 'quote', 'text_offset'):
        if k not in c or c[k] in (None, ''):
            errors.append('%s: citation lacks %s' % (where, k))
    if errors and any(e.startswith(where + ': citation lacks') for e in errors):
        return False
    sid, quote = c['source'], c['quote']
    if not isinstance(sid, str):
        errors.append('%s: source must be a string id of SOURCES.md' % where)
        return False
    led = ctx.ledger().get(sid)
    if led is None:
        errors.append('%s: source %r is not in SOURCES.md' % (where, sid))
        return False
    if led.get('class') not in SOURCE_CLASSES:
        errors.append('%s: source %r has class %r (allowed: %s)' % (where, sid, led.get('class'), ', '.join(SOURCE_CLASSES)))
    if need_class_not_lead and led.get('class') == 'lead':
        errors.append('%s: source %r is a lead (class lead): a lead can point to a primary source, it cannot make a claim documented or inferred' % (where, sid))
        return False
    path, why = resolve_text(ctx, sid, c.get('part'))
    if path is None:
        errors.append('%s: %s' % (where, why))
        return False
    if not isinstance(quote, str):
        errors.append('%s: quote must be a string' % where)
        return False
    if len(quote) > MAX_QUOTE_CHARS:
        errors.append('%s: quote of %d characters is longer than %d: quote the short passage that carries the claim' % (where, len(quote), MAX_QUOTE_CHARS))
    qs = quote_skeleton(quote)
    mode = c.get('quote_mode', 'verbatim')
    if mode not in ('verbatim', 'ocr'):
        errors.append('%s: quote_mode must be verbatim or ocr' % where)
        return False
    raw_text, skel, omap, marks = ctx.text(path)
    find_what = quote
    if mode == 'ocr':
        raw = c.get('raw')
        if not isinstance(raw, str) or not raw.strip():
            errors.append('%s: quote_mode ocr needs `raw`: the excerpt exactly as the text layer has it' % where)
            return False
        if not c.get('ocr_note'):
            errors.append('%s: quote_mode ocr needs `ocr_note` (what is damaged in the text layer)' % where)
        rs = quote_skeleton(raw)
        ok, digit, msg = ocr_difference(rs, qs)
        if not ok:
            errors.append('%s: the corrected quote differs from the raw excerpt by more than OCR confusions: %s' % (where, msg))
            return False
        if digit and c.get('page_image_viewed') is not True:
            errors.append('%s: the correction touches a digit: page_image_viewed must be true (the page image was looked at)' % where)
        if rs == qs:
            warnings.append('%s: quote_mode ocr but the quote equals the raw excerpt: use verbatim' % where)
        find_what = raw
        qs = rs
    elif c.get('raw') is not None or c.get('page_image_viewed') not in (None, True, False):
        warnings.append('%s: raw / page_image_viewed given with quote_mode verbatim: ignored' % where)
    if len(qs) < MIN_QUOTE_ALNUM:
        errors.append('%s: quote has %d letters and digits; at least %d are needed so that a match means something' % (where, len(qs), MIN_QUOTE_ALNUM))
        return False
    starts = match_quote(skel, omap, find_what)
    if not starts:
        errors.append('%s: quote not found in %s (%s): %r' % (where, path, 'raw excerpt' if mode == 'ocr' else 'whitespace, punctuation, hyphenation, case tolerant', find_what[:90]))
        return False
    off = c.get('text_offset')
    if not isinstance(off, int) or isinstance(off, bool):
        errors.append('%s: text_offset must be an integer' % where)
        return False
    hit = [s for s in starts if s - 8 <= off <= s]
    if not hit:
        errors.append('%s: text_offset %s does not match any occurrence of the quote in %s (occurrences start at %s)' % (where, off, path, ', '.join(str(s) for s in starts[:6])))
        return False
    start = hit[0]
    # page
    model = (led.get('pages') or 'none').strip().lower()
    page = c.get('page')
    if model == 'markers':
        pg = None
        for pos, n in marks:
            if pos <= start:
                pg = n
            else:
                break
        if pg is None:
            errors.append('%s: no page marker before the quote in %s' % (where, path))
        elif page is None or str(page).strip() != str(pg):
            errors.append('%s: page is %r but the quote starts on page %d of %s (=== PAGE n === markers)' % (where, page, pg, path))
    elif model == 'or27':
        part = c.get('part')
        rec = ctx.or27().get(part) if isinstance(part, str) else None
        if rec is None:
            if ctx.or27():
                errors.append('%s: part %r is not an OR27 record id of docs/battle-theatre/library/or27_index.json (e.g. OR27-1-R043)' % (where, part))
        else:
            if not (rec['start_offset'] <= start < rec['end_offset']):
                errors.append('%s: the quote at offset %d is not inside record %s (%d..%d)' % (where, start, part, rec['start_offset'], rec['end_offset']))
            try:
                pn = int(str(page).split('-')[0].strip('~ '))
                lo, hi = rec.get('start_page'), rec.get('end_page')
                slack = 0 if rec.get('start_page_conf') in ('head', 'head-corrected') else 2
                if lo is not None and hi is not None and not (lo - slack <= pn <= hi + slack):
                    errors.append('%s: page %s is outside the printed pages %s-%s of record %s' % (where, page, lo, hi, part))
            except Exception:
                errors.append('%s: page %r is not a printed page number of OR27' % (where, page))
    else:
        if page in (None, '') and not c.get('page_note'):
            errors.append('%s: page is empty: give the printed page, or null with page_note saying the text has no page marks' % where)
    # the numbers of the value stand in the quote
    if numbers_in is not None:
        numbers_in.append(quote)
    # the integrity of the file the offsets rest on
    h = (led.get('sha256') or '').strip().lower()
    if '{part}' in led.get('text', ''):
        fam = ctx.families().get(sid) or {}
        ph = fam.get(c.get('part'))
        if ph:
            key = ('sha', path)
            if key not in ctx._texts:
                with open(os.path.join(ctx.root, path), 'rb') as f:
                    ctx._texts[key] = hashlib.sha256(f.read()).hexdigest()
            if ctx._texts[key] != ph:
                errors.append('%s: the sha256 of %s differs from evidence/ledger-families.json: the text changed since the ledger entry' % (where, path))
    if re.fullmatch(r'[0-9a-f]{64}', h) and '{part}' not in led.get('text', ''):
        key = ('sha', path)
        if key not in ctx._texts:
            with open(os.path.join(ctx.root, path), 'rb') as f:
                ctx._texts[key] = hashlib.sha256(f.read()).hexdigest()
        if ctx._texts[key] != h:
            errors.append('%s: the sha256 of %s differs from the ledger: the text changed since the ledger entry, so recorded offsets may be wrong' % (where, path))
    return True


# ------------------------------------------------------------------------------------------------ rows
def load_rows(path):
    rows, errs = [], []
    try:
        with open(path, encoding='utf-8') as f:
            lines = f.readlines()
    except UnicodeDecodeError as e:
        return [], ['line ?: the file is not UTF-8 (%s)' % str(e)[:80]]
    for n, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            r = json.loads(line)
        except Exception as e:
            errs.append('line %d: not JSON (%s)' % (n, str(e)[:60]))
            continue
        if not isinstance(r, dict):
            errs.append('line %d: not an object' % n)
            continue
        r['__line__'] = n
        rows.append(r)
    return rows, errs


def known_ids(ctx, gid):
    g = ctx.groups()[gid]
    m = g['members']
    ids = set()
    for k in ('records', 'record_parts', 'basemap_structures', 'bridges', 'railways', 'fences', 'roads', 'lanes', 'other_records'):
        ids.update(m.get(k, []))
    return ids


def all_owned(ctx):
    own = {}
    for gid, g in ctx.groups().items():
        for k, v in g['members'].items():
            if k == 'hospitals':
                continue
            for i in v:
                own.setdefault(i, gid)
    return own


def check_value(field, value, tier, where, errors, warnings):
    if tier == 'open gap':
        if value is not None:
            errors.append('%s: an open gap has value null' % where)
        return
    if value is None:
        errors.append('%s: value is null but the tier is %s: a row with no value is an open gap' % (where, tier))
        return
    if field == 'storeys':
        if not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0 or (value * 2) % 1 != 0:
            errors.append('%s: storeys must be a number in steps of 0.5 (1, 1.5, 2 ...)' % where)
    elif field == 'existed_july_1863':
        if value not in EXISTS_VALUES:
            errors.append('%s: existed_july_1863 must be one of %s' % (where, ', '.join(EXISTS_VALUES)))
    elif field == 'walls':
        if not isinstance(value, dict) or value.get('material') not in MATERIALS:
            errors.append('%s: walls is {"material": one of %s, "finish": optional text}' % (where, ', '.join(MATERIALS)))
    elif field == 'roof':
        if not isinstance(value, dict) or not (value.get('form') or value.get('material')):
            errors.append('%s: roof is {"form": %s, "material": %s}' % (where, '|'.join(ROOF_FORMS), '|'.join(ROOF_MATERIALS)))
        else:
            if value.get('form') is not None and value['form'] not in ROOF_FORMS:
                errors.append('%s: roof form %r not in %s' % (where, value['form'], ROOF_FORMS))
            if value.get('material') is not None and value['material'] not in ROOF_MATERIALS:
                errors.append('%s: roof material %r not in %s' % (where, value['material'], ROOF_MATERIALS))
    elif field == 'footprint':
        if not isinstance(value, dict) or not ((('w' in value) and ('d' in value)) or 'area' in value) or value.get('unit') not in UNITS:
            errors.append('%s: footprint is {"w": n, "d": n, "unit": %s} or {"area": n, "unit": ...}' % (where, '|'.join(UNITS)))
    elif field in ('height', 'span', 'length', 'width', 'frontage'):
        if not isinstance(value, dict) or not isinstance(value.get('value'), (int, float)) or value.get('unit') not in UNITS:
            errors.append('%s: %s is {"value": n, "unit": %s}' % (where, field, '|'.join(UNITS)))
    elif field == 'place':
        if not isinstance(value, dict) or not isinstance(value.get('text'), str) or not value['text'].strip():
            errors.append('%s: place is {"text": where, "lng": x, "lat": y, "error_m": n, "method": %s}' % (where, '|'.join(PLACE_METHODS)))
        else:
            has = ('lng' in value) or ('lat' in value)
            if has:
                try:
                    lng, lat = float(value['lng']), float(value['lat'])
                    if not (BBOX[0] <= lng <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
                        errors.append('%s: place %s,%s is outside the battlefield box %s' % (where, lng, lat, BBOX))
                except Exception:
                    errors.append('%s: place lng and lat must be numbers' % where)
                if not isinstance(value.get('error_m'), (int, float)) or value['error_m'] <= 0:
                    errors.append('%s: a place with coordinates needs error_m (metres, > 0): the error bound of the position' % where)
                if value.get('method') not in PLACE_METHODS:
                    errors.append('%s: place method must be one of %s' % (where, ', '.join(PLACE_METHODS)))
    elif field == 'kind':
        if not isinstance(value, str) or not value.strip():
            errors.append('%s: kind is a short word (house, barn, bank_barn, tavern, church, courthouse, school, mill, bridge, fence, wall, road, ...)' % where)
    elif field in ('name', 'occupant', 'owner', 'use', 'identity', 'orientation', 'plan_shape', 'foundation', 'colour', 'interior_change', 'lot_enclosure', 'orchard_or_garden',
                   'sign', 'fence_type', 'wall_type', 'surface', 'terrain_change', 'extent'):
        if not (isinstance(value, (str, dict, list)) and value):
            errors.append('%s: %s needs a non-empty value (text, or an object/list)' % (where, field))
    elif field in ('built', 'lost'):
        if not isinstance(value, (dict, int, str)):
            errors.append('%s: %s is a year, or {"year": n, "note": text}' % (where, field))
    elif field in ('outbuildings', 'additions', 'chimneys', 'openings', 'porch', 'tower_or_cupola'):
        if not (isinstance(value, (dict, list, str, int)) and value not in ('', [], {})):
            errors.append('%s: %s needs a value' % (where, field))
    elif field == 'photograph':
        if not (isinstance(value, dict) and re.fullmatch(r'[0-9A-Za-z._-]{4,}', str(value.get('loc_id', ''))) and value.get('shows')):
            errors.append('%s: photograph is {"loc_id": record id, "shows": what is visible}' % where)
    elif field == 'state':
        pass   # checked with the state keys


def validate_rows(ctx, rows, gid_expected, errors, warnings, stats, seen_ids, file_label):
    """Validate the rows of one file. gid_expected: a group id, or None when every row names its own group (EXAMPLES.jsonl)."""
    groups = ctx.groups()
    byid = {}
    declared = {}
    for r in rows:
        rid = r.get('row')
        where = '%s line %s (%s)' % (file_label, r['__line__'], rid)
        if not isinstance(rid, str):
            errors.append('%s: row id missing' % where)
            continue
        m = ROW_ID_RE.match(rid)
        g = r.get('group')
        if not isinstance(g, str) or g not in groups:
            errors.append('%s: group %r is not a group of groups.json' % (where, g))
            continue
        if gid_expected is not None and g != gid_expected:
            errors.append('%s: group %r differs from the file group %r' % (where, g, gid_expected))
        if not m or m.group(1) != g:
            errors.append('%s: row id must be <group>.<four or more digits> (e.g. %s.0001)' % (where, g))
        if rid in byid:
            errors.append('%s: duplicate row id %s (also at line %s)' % (where, rid, byid[rid]['__line__']))
            continue
        byid[rid] = r
        if rid in seen_ids and seen_ids[rid] != file_label:
            errors.append('%s: row id %s is also used in %s' % (where, rid, seen_ids[rid]))
        seen_ids[rid] = file_label
        t = r.get('type')
        if t not in ROW_TYPES:
            errors.append('%s: type must be one of %s' % (where, ', '.join(ROW_TYPES)))
            continue
        allowed = BUILDING_KEYS if t == 'building' else SEARCH_KEYS if t == 'search' else FIELD_KEYS
        for k in r:
            if k == '__line__' or k in allowed or k.startswith('x_'):
                continue
            errors.append('%s: unknown key %r for a %s row' % (where, k, t))
        stats['rows'] += 1
        stats['by_type'][t] = stats['by_type'].get(t, 0) + 1
        if t == 'building':
            bid = r.get('building')
            if not isinstance(bid, str):
                errors.append('%s: building id missing' % where)
                continue
            if not (isinstance(r.get('name'), str) and r['name'].strip()):
                errors.append('%s: a building row needs a name' % where)
            if r.get('declared_from') not in DECLARED_FROM:
                errors.append('%s: declared_from must be one of %s' % (where, ', '.join(DECLARED_FROM)))
            tm = TWN_RE.match(bid)
            if tm:
                if tm.group(1) != groups[g]['prefix']:
                    errors.append('%s: new id %s must carry the prefix %s of group %s' % (where, bid, groups[g]['prefix'], g))
                if r.get('declared_from') != 'new':
                    errors.append('%s: a TWN id is declared_from "new"' % where)
                if not (isinstance(r.get('new_reason'), str) and len(r['new_reason']) >= 12):
                    errors.append('%s: a new building needs new_reason: why no record of the repository names it' % where)
            else:
                owned = all_owned(ctx).get(bid)
                if owned is None:
                    errors.append('%s: %r is neither an id of the repository inventory (groups.json) nor a TWN-%s-NNNN id' % (where, bid, groups[g]['prefix']))
                elif owned != g:
                    errors.append('%s: %r belongs to group %s: report it there (a request note), do not declare it here' % (where, bid, owned))
                if r.get('declared_from') == 'new':
                    errors.append('%s: declared_from "new" is for TWN ids only' % where)
            if bid in declared:
                errors.append('%s: building %s declared twice (line %s)' % (where, bid, declared[bid]['__line__']))
            declared[bid] = r
    # second pass: field and search rows need a declared building
    fields_of = {}
    for r in rows:
        rid = r.get('row')
        if not isinstance(rid, str) or rid not in byid or byid[rid] is not r or r.get('type') not in ('field', 'search'):
            continue
        where = '%s line %s (%s)' % (file_label, r['__line__'], rid)
        g = r.get('group')
        bid = r.get('building')
        if not isinstance(bid, str):
            errors.append('%s: building must be a string id' % where)
            continue
        if r['type'] == 'search':
            if bid != '*' and bid not in declared:
                errors.append('%s: search row names building %r which no building row declares (use "*" for a group-wide search)' % (where, bid))
            for k in ('where', 'query', 'at'):
                if not (isinstance(r.get(k), str) and r[k].strip()):
                    errors.append('%s: search row needs %s' % (where, k))
            if r.get('outcome') not in SEARCH_OUTCOMES:
                errors.append('%s: outcome must be one of %s' % (where, ', '.join(SEARCH_OUTCOMES)))
            if r.get('at') and not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(r['at'])):
                errors.append('%s: at is a date YYYY-MM-DD' % where)
            continue
        # field row
        if bid not in declared:
            errors.append('%s: building %r is not declared by a building row of this file' % (where, bid))
            continue
        fld = r.get('field')
        if fld not in FIELDS and not (isinstance(fld, str) and fld.startswith('x_')):
            errors.append('%s: field %r is not in the vocabulary (use --schema; an extension field starts with x_ and needs x_reason)' % (where, fld))
            continue
        if isinstance(fld, str) and fld.startswith('x_') and not r.get('x_reason'):
            errors.append('%s: an extension field needs x_reason' % where)
        tier = r.get('tier')
        if tier not in TIERS:
            errors.append('%s: tier %r is not allowed (%s)' % (where, tier, ', '.join(TIERS)))
            continue
        stats['by_tier'][tier] = stats['by_tier'].get(tier, 0) + 1
        fields_of.setdefault(bid, {}).setdefault(fld, []).append(r)
        ek = r.get('evidence_kind')
        if ek not in EVIDENCE_KINDS:
            errors.append('%s: evidence_kind must be one of %s' % (where, ', '.join(EVIDENCE_KINDS)))
            continue
        if r.get('describes') not in DESCRIBES:
            errors.append('%s: describes must be one of %s (the time the evidence speaks about)' % (where, ', '.join(DESCRIBES)))
        if 'value' not in r:
            errors.append('%s: value missing (null for an open gap)' % where)
            continue
        check_value(fld, r['value'], tier, where, errors, warnings)
        if fld == 'state' and tier != 'open gap':
            st = r.get('state')
            if st not in STATES:
                errors.append('%s: state must be one of %s' % (where, ', '.join(STATES)))
            if r.get('window') not in WINDOWS:
                errors.append('%s: window must be one of %s' % (where, ', '.join(WINDOWS)))
            if r.get('transition') not in TRANSITIONS:
                errors.append('%s: transition must be one of %s' % (where, ', '.join(TRANSITIONS)))
            for k in ('from', 'to'):
                v = r.get(k)
                if v is not None and not ISO_RE.match(str(v)):
                    errors.append('%s: %s is a local time YYYY-MM-DD or YYYY-MM-DDTHH:MM (or null when the window is unknown)' % (where, k))
            if r.get('window') in ('clock', 'day') and (r.get('from') is None or r.get('to') is None):
                errors.append('%s: a window of kind %s needs from and to' % (where, r.get('window')))
            if r.get('from') and r.get('to') and ISO_RE.match(str(r['from'])) and ISO_RE.match(str(r['to'])) and str(r['from']) > str(r['to']):
                errors.append('%s: from is after to' % where)
        if tier == 'open gap':
            if ek != 'none':
                errors.append('%s: an open gap has evidence_kind none' % where)
            sr = r.get('searched')
            if not (isinstance(sr, list) and sr):
                errors.append('%s: an open gap names the searches that found nothing: searched: [search row ids]' % where)
            else:
                for s in sr:
                    sx = byid.get(s) if isinstance(s, str) else None
                    if sx is None or sx.get('type') != 'search':
                        errors.append('%s: searched %r is not a search row of this file' % (where, s))
                    elif sx.get('outcome') == 'found':
                        errors.append('%s: searched %s has outcome found: that is not a failed search' % (where, s))
            continue
        if tier == 'plausible-procedural':
            if ek != 'none':
                errors.append('%s: plausible-procedural has evidence_kind none (a generic rule, not a source)' % where)
            rule = r.get('rule')
            if not isinstance(rule, str) or rule not in ctx.rules():
                errors.append('%s: rule %r is not in generic_rules.json' % (where, rule))
            continue
        # documented and inferred: evidence
        if ek == 'none' and not (tier == 'inferred' and r.get('premises')):
            errors.append('%s: a %s row needs evidence (text, image or map); an inferred row may rest on `premises` alone' % (where, tier))
            continue
        quotes = []
        anchored = False
        if ek == 'text':
            cite = {k: r.get(k) for k in CITE_KEYS if k in r}
            ok = check_cite(ctx, cite, where, errors, warnings, need_class_not_lead=True, numbers_in=quotes)
            anchored = anchored or ok
            alsol = r.get('also') or []
            if not isinstance(alsol, list):
                errors.append('%s: also is a list of citation objects' % where)
                alsol = []
            for i, a in enumerate(alsol):
                if not isinstance(a, dict) or set(a) - CITE_KEYS:
                    errors.append('%s: also[%d] is a citation object with keys %s' % (where, i, sorted(CITE_KEYS)))
                    continue
                check_cite(ctx, a, '%s also[%d]' % (where, i), errors, warnings, need_class_not_lead=True, numbers_in=quotes)
        elif ek in ('image', 'map'):
            im = r.get('image_ref')
            if not isinstance(im, dict):
                errors.append('%s: evidence_kind %s needs image_ref {"source": ledger id, "item": record or sheet, "observation": text, "viewed": true}' % (where, ek))
            else:
                isrc = im.get('source')
                led = ctx.ledger().get(isrc) if isinstance(isrc, str) else None
                if led is None:
                    errors.append('%s: image_ref source %r is not in SOURCES.md' % (where, im.get('source')))
                elif led.get('class') == 'lead':
                    errors.append('%s: image_ref source %r is a lead' % (where, im.get('source')))
                if im.get('viewed') is not True:
                    errors.append('%s: image_ref.viewed must be true: an image reading is made only from an image that was looked at' % where)
                for k in ('item', 'observation'):
                    if not (isinstance(im.get(k), str) and im[k].strip()):
                        errors.append('%s: image_ref.%s missing' % (where, k))
                if im.get('file') is not None and not isinstance(im.get('file'), str):
                    errors.append('%s: image_ref.file must be a path string' % where)
                elif im.get('file'):
                    fp = os.path.join(ctx.root, im['file'])
                    if not os.path.exists(fp):
                        errors.append('%s: image_ref.file %s does not exist' % (where, im['file']))
                    elif isinstance(im.get('sha256'), str) and im.get('sha256'):
                        with open(fp, 'rb') as f:
                            if hashlib.sha256(f.read()).hexdigest() != im['sha256']:
                                errors.append('%s: image_ref.sha256 differs from the file' % where)
                anchored = True
                if tier == 'documented':
                    if fld in MEASURE_FIELDS:
                        errors.append('%s: a measurement read from a map or photograph is at best inferred (no documented camera or scale): tier documented is refused for field %s' % (where, fld))
                    elif fld not in OBSERVABLE_FIELDS:
                        errors.append('%s: field %s cannot be documented from an image alone' % (where, fld))
                    elif im.get('caption_names_building') is not True:
                        errors.append('%s: documented from an image needs image_ref.caption_names_building true (the record or caption itself names the building)' % where)
                if fld in MEASURE_FIELDS and tier == 'inferred' and not (r.get('method') or r.get('basis')):
                    errors.append('%s: a measurement read from an image needs `method` or `basis` (how it was read, with what scale)' % where)
                if r.get('quote'):   # a caption or record text may accompany the image reading
                    cite = {k: r.get(k) for k in CITE_KEYS if k in r}
                    check_cite(ctx, cite, where, errors, warnings, need_class_not_lead=False, numbers_in=quotes)
        if tier == 'inferred':
            if not (isinstance(r.get('basis'), str) and len(r['basis'].strip()) >= 20):
                errors.append('%s: an inferred row needs `basis` (at least 20 characters: what is inferred from what)' % where)
            prem = r.get('premises') or []
            if not isinstance(prem, list):
                errors.append('%s: premises is a list of row ids' % where)
                prem = []
            for p in prem:
                px = byid.get(p) if isinstance(p, str) else None
                if px is None or px.get('type') != 'field' or px.get('tier') not in ('documented', 'inferred'):
                    errors.append('%s: premise %r is not a documented or inferred field row of this file' % (where, p))
                else:
                    anchored = True
            if not anchored:
                errors.append('%s: an inferred row needs a citation, an image reading or premises' % where)
        # a statement about a later state cannot make an 1863 form documented
        desc = r.get('describes')
        need_cont = False
        if tier == 'documented':
            if desc in ('later', 'undated') and fld not in CONTINUITY_EXEMPT:
                need_cont = True
            if desc == 'after_battle_to_1869' and fld in FORM_FIELDS:
                need_cont = True
        if need_cont:
            c2 = r.get('continuity')
            if not isinstance(c2, dict):
                errors.append('%s: describes %s cannot make an 1863 %s documented without `continuity`: a second citation that says the feature is unchanged since 1863 (otherwise the tier is inferred, with a basis)' % (where, desc, fld))
            else:
                check_cite(ctx, c2, '%s continuity' % where, errors, warnings, need_class_not_lead=True, numbers_in=None)
        # the numbers
        vn = value_numbers(fld, r.get('value'))
        if fld == 'state' and isinstance(r.get('count'), (int, float)) and not isinstance(r.get('count'), bool):
            vn = vn + [('count', float(r['count']))]
            if not r.get('count_basis'):
                errors.append('%s: a count needs count_basis (what is counted: bullet strikes, shell hits, wounded...)' % where)
        if vn and ek == 'text' or (vn and r.get('quote')):
            have = set()
            for q in quotes:
                have |= number_set(q)
            if isinstance(r.get('continuity'), dict):
                have |= number_set(r['continuity'].get('quote'))
            for k, v in vn:
                if v not in have and not (v == int(v) and float(int(v)) in have):
                    if r.get('derived') is True and r.get('derivation') and tier != 'documented':
                        continue
                    errors.append('%s: the number %s of the value (%s) is in no quote of the row: a number must be written in the source (set derived true and give derivation for an inferred conversion)' % (where, ('%g' % v), k))
        elif vn and ek != 'text' and tier == 'documented':
            pass
    # conflicts: both rows name each other
    for r in rows:
        rid = r.get('row')
        if not isinstance(rid, str) or rid not in byid or byid[rid] is not r or r.get('type') != 'field':
            continue
        cl = r.get('conflicts') or []
        if not isinstance(cl, list):
            errors.append('%s line %s (%s): conflicts is a list of {"with": row id, "nature": text}' % (file_label, r['__line__'], rid))
            cl = []
        for c in cl:
            where = '%s line %s (%s)' % (file_label, r['__line__'], rid)
            if not isinstance(c, dict) or not isinstance(c.get('with'), str) or not isinstance(c.get('nature'), str) or len(c['nature'].strip()) < 8:
                errors.append('%s: conflicts is a list of {"with": row id, "nature": what differs}' % where)
                continue
            o = byid.get(c['with']) if isinstance(c.get('with'), str) else None
            if o is None:
                errors.append('%s: conflict names row %r which is not in this file' % (where, c['with']))
            elif o.get('type') != 'field':
                errors.append('%s: conflict names %s which is not a field row' % (where, c['with']))
            elif not any(isinstance(x, dict) and x.get('with') == rid for x in (o.get('conflicts') or [])):
                errors.append('%s: conflict with %s is not written on that row as well (a conflict is carried on both rows)' % (where, c['with']))
    return declared, fields_of, byid


def required_for(fields_of_building):
    prof = 'building'
    for r in fields_of_building.get('kind', []):
        v = r.get('value')
        if isinstance(v, str) and v in KIND_PROFILE:
            prof = KIND_PROFILE[v]
    return prof, REQUIRED_FIELDS[prof]


def validate_group(ctx, gid, path, errors, warnings, stats, seen_ids, complete=False, as_file=False):
    label = os.path.relpath(path, ctx.root)
    rows, errs = load_rows(path)
    errors.extend('%s %s' % (label, e) for e in errs)
    declared, fields_of, byid = validate_rows(ctx, rows, None if as_file else gid, errors, warnings, stats, seen_ids, label)
    if complete:
        for bid in declared:
            prof, req = required_for(fields_of.get(bid, {}))
            miss = [f for f in req if f not in fields_of.get(bid, {})]
            if miss:
                errors.append('%s: building %s (profile %s) has no row for: %s (write an evidence row or an open-gap row for each)' % (label, bid, prof, ', '.join(miss)))
    else:
        for bid in declared:
            if not fields_of.get(bid):
                warnings.append('%s: building %s is declared and has no field row yet' % (label, bid))
    stats['buildings'] += len(declared)
    return declared


def run_group(ctx, gid, allow_missing=False, complete=False):
    errors, warnings = [], []
    stats = {'rows': 0, 'by_type': {}, 'by_tier': {}, 'buildings': 0}
    path = os.path.join(ctx.evid, gid + '.jsonl')
    if gid not in ctx.groups():
        return None, ['group %r is not in evidence/groups.json (%s)' % (gid, ', '.join(sorted(ctx.groups())))], [], stats
    if not os.path.exists(path):
        if allow_missing:
            return True, [], ['%s: no file yet (not started)' % gid], stats
        return False, ['%s: file %s does not exist' % (gid, os.path.relpath(path, ctx.root))], [], stats
    seen = {}
    validate_group(ctx, gid, path, errors, warnings, stats, seen, complete=complete)
    return not errors, errors, warnings, stats


def run_all(ctx, allow_missing=False, complete=False):
    errors, warnings = [], []
    stats = {'rows': 0, 'by_type': {}, 'by_tier': {}, 'buildings': 0}
    seen = {}
    twn = {}
    started = 0
    for gid in ctx.groups():
        path = os.path.join(ctx.evid, gid + '.jsonl')
        if not os.path.exists(path):
            (warnings if allow_missing else errors).append('%s: no evidence file (%s)' % (gid, 'not started' if allow_missing else os.path.relpath(path, ctx.root)))
            continue
        started += 1
        declared = validate_group(ctx, gid, path, errors, warnings, stats, seen, complete=complete)
        for bid in declared:
            if TWN_RE.match(bid):
                if bid in twn:
                    errors.append('%s: TWN id %s also declared in %s' % (gid, bid, twn[bid]))
                twn[bid] = gid
    stats['groups_started'] = started
    return not errors, errors, warnings, stats


# ------------------------------------------------------------------------------------------------ ledger check
def check_ledger(ctx):
    errors, ok = [], 0
    led = ctx.ledger()
    for d in led.get('__duplicates__', []):
        errors.append('ledger: source id %s appears twice' % d)
    for sid, row in led.items():
        if sid == '__duplicates__':
            continue
        if row.get('class') not in SOURCE_CLASSES:
            errors.append('ledger %s: class %r not in %s' % (sid, row.get('class'), SOURCE_CLASSES))
        if row.get('pages', 'none') not in ('markers', 'or27', 'none', ''):
            errors.append('ledger %s: pages %r not in markers, or27, none' % (sid, row.get('pages')))
        t = row.get('text', '')
        if not t or t in ('-', 'none'):
            continue
        if '{part}' in t:
            d = os.path.dirname(t)
            if not os.path.isdir(os.path.join(ctx.root, d)):
                errors.append('ledger %s: directory %s missing' % (sid, d))
            else:
                ok += 1
            continue
        p = os.path.join(ctx.root, t)
        if not os.path.exists(p):
            errors.append('ledger %s: file %s missing' % (sid, t))
            continue
        h = (row.get('sha256') or '').lower()
        if re.fullmatch(r'[0-9a-f]{64}', h):
            with open(p, 'rb') as f:
                if hashlib.sha256(f.read()).hexdigest() != h:
                    errors.append('ledger %s: sha256 of %s differs' % (sid, t))
                    continue
        ok += 1
    return not errors, errors, ok


def print_schema():
    s = {
        'tiers': TIERS, 'source_classes': SOURCE_CLASSES, 'evidence_kinds': EVIDENCE_KINDS, 'row_types': ROW_TYPES, 'describes': DESCRIBES, 'declared_from': DECLARED_FROM,
        'fields': FIELDS, 'states': STATES, 'windows': WINDOWS, 'transitions': TRANSITIONS, 'exists_values': EXISTS_VALUES, 'materials': MATERIALS, 'roof_forms': ROOF_FORMS,
        'roof_materials': ROOF_MATERIALS, 'place_methods': PLACE_METHODS, 'units': UNITS, 'observable_fields': OBSERVABLE_FIELDS, 'measure_fields': MEASURE_FIELDS,
        'numbers_that_must_stand_in_a_quote': QUOTED_NUMBER_KEYS, 'required_fields_for_complete': REQUIRED_FIELDS, 'kind_profiles': KIND_PROFILE,
        'keys': {'building': sorted(BUILDING_KEYS), 'field': sorted(FIELD_KEYS), 'search': sorted(SEARCH_KEYS)}, 'ledger_columns': LEDGER_COLUMNS,
        'quote_limits': {'min_letters_and_digits': MIN_QUOTE_ALNUM, 'max_characters': MAX_QUOTE_CHARS},
    }
    print(json.dumps(s, indent=1))


def report(ctx, label, ok, errors, warnings, stats):
    print('%s: %s | rows %d (%s) | buildings %d | tiers %s' % (label, 'OK' if ok else 'FAIL', stats['rows'], ', '.join('%s %d' % kv for kv in sorted(stats['by_type'].items())) or '-',
                                                          stats['buildings'], ', '.join('%s %d' % kv for kv in sorted(stats['by_tier'].items())) or '-'))
    for e in errors[:200]:
        print('  ERROR', e)
    if len(errors) > 200:
        print('  ... %d more errors' % (len(errors) - 200))
    for w in warnings[:60]:
        print('  warn ', w)
    try:
        os.makedirs(os.path.join(ctx.root, 'tmp', 'town', 'validation'), exist_ok=True)
        with open(os.path.join(ctx.root, 'tmp', 'town', 'validation', label.replace('/', '_') + '.json'), 'w', encoding='utf-8') as f:
            json.dump({'ok': ok, 'stats': stats, 'errors': errors, 'warnings': warnings}, f, indent=1)
    except OSError:
        pass


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    flags = {a for a in argv if a.startswith('--')}
    if '--self-test' in flags:
        sys.path.insert(0, HERE)
        import validate_evidence_selftest as st
        return st.run(sys.modules[__name__])
    ctx = Ctx(REAL_ROOT)
    if '--schema' in flags:
        print_schema()
        return 0
    if '--check-ledger' in flags:
        ok, errs, n = check_ledger(ctx)
        print('ledger: %d sources with local text checked; %s' % (n, 'OK' if ok else 'FAIL'))
        for e in errs:
            print('  ERROR', e)
        return 0 if ok else 1
    complete = '--complete' in flags
    if '--file' in flags:
        i = argv.index('--file')
        path = argv[i + 1]
        errors, warnings = [], []
        stats = {'rows': 0, 'by_type': {}, 'by_tier': {}, 'buildings': 0}
        validate_group(ctx, None, os.path.abspath(path), errors, warnings, stats, {}, complete=complete, as_file=True)
        report(ctx, 'file-' + os.path.basename(path), not errors, errors, warnings, stats)
        return 0 if not errors else 1
    if '--all' in flags:
        ok, errors, warnings, stats = run_all(ctx, allow_missing='--allow-missing' in flags, complete=complete)
        report(ctx, 'all', ok, errors, warnings, stats)
        return 0 if ok else 1
    if len(args) != 1:
        print(__doc__)
        return 2
    ok, errors, warnings, stats = run_group(ctx, args[0], allow_missing=False, complete=complete)
    if ok is None:
        print('ERROR', errors[0])
        return 2
    report(ctx, args[0], ok, errors, warnings, stats)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
