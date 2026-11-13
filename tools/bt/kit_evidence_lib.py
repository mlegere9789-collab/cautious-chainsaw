"""Shared library of the kit evidence pass: the contract of an evidence line, the citable texts, and the helper commands of the research groups.

Everything here is deterministic and offline. The contract (CONTRACT, FIELD_SPECS, BASES, ERRORS) is the single source of the rules that
tools/bt/kit_evidence_check.py enforces and that docs/battle-theatre/kit/evidence/PLAN.md prints.

Helper commands (run with python -I; a research group needs only these three):
    python -I tools/bt/kit_evidence_lib.py find  <source_id> "<regex>" [-C 160] [--max 20] [--fuzzy]     search a source, print each hit as a citation
    python -I tools/bt/kit_evidence_lib.py cite  <source_id> "<exact quote>" [--offset N]                  locate a quote and print the citation fields of an evidence line
    python -I tools/bt/kit_evidence_lib.py image <source_id> <printed_page> [--dpi 130] [--out DIR]       render one scanned page of an Official Records part to a PNG
    python -I tools/bt/kit_evidence_lib.py unit  <unit_id>                                                what the plan says about a unit (group, kit record, fields still open, reading list)
    python -I tools/bt/kit_evidence_lib.py template <field>                                               a valid example line for a field
    python -I tools/bt/kit_evidence_lib.py sources                                                        the citable sources and their page models
Offsets are CHARACTER offsets into the source file decoded as UTF-8 with newline='' (the or27_lib convention). Matching is on a normalized view
(whitespace collapsed, end-of-line hyphenation joined, running heads removed, typographic quotes and dashes folded), case-sensitive.
Printed pages of the Official Records come from the scan-leaf map (docs/battle-theatre/kit/evidence/or27_leaf_pages.json), not from the running heads."""
import bisect, collections, hashlib, json, os, pickle, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
EV = os.path.join(BT, 'kit', 'evidence')
CACHE = os.path.join(ROOT, 'tmp', 'kit-plan', 'cache')
sys.path.insert(0, HERE)

SCHEMA_VERSION = 1

# ---------------------------------------------------------------------------------------------------------------------
# The contract
LINE_TYPES = {
    'evidence': 'one datum about one unit, with its citation',
    'gap': 'a failed lookup: what was searched and not found (Law cl.4: a failed lookup is recorded as failed; cl.7: a gap is visible)',
    'source': 'declaration of a citable text that sources.json does not list yet',
}
TIERS = ('documented', 'inferred', 'plausible-procedural')
FIELDS = {
    'roster': 'the unit as the record names it: designation, kind, place in the organization, engaged or not',
    'commander': 'one commander of the unit, with rank, order of succession and what happened to the man',
    'officer': 'any other officer the record names with the unit (field, staff or company officer, lieutenant upwards)',
    'strength': 'men taken into action, present for duty or aggregate, as a range with the kind of figure',
    'casualties': 'killed, wounded, captured or missing as the record prints them',
    'arms': 'the weapons of the unit as the source states them (shoulder arms, bayonets, side arms)',
    'guns': 'the pieces of a battery (or the total of a battalion): type and count as the source states them',
    'dress': 'dress or equipment the record states, tied to one kit field',
    'horses': 'horses present, serviceable, unserviceable or lost',
    'ammunition': 'rounds carried or expended',
    'detachment': 'companies or parties absent, detached or attached, and whether the strength includes them',
}
KIT_FIELDS = ['headgear', 'coat', 'shirt', 'trousers', 'shoes', 'accoutrements', 'weapon', 'bayonet', 'sidearm_sword', 'sash', 'pack_state', 'badge', 'flag_or_instrument']
ARMS_KIT_FIELDS = ('weapon', 'bayonet', 'sidearm_sword')
DRESS_KIT_FIELDS = tuple(f for f in KIT_FIELDS if f not in ARMS_KIT_FIELDS)
SHARES = ('all', 'most', 'majority', 'minority', 'some', 'few', 'rare')
UNIT_KINDS = ('army', 'corps', 'division', 'brigade', 'regiment', 'battalion', 'battery', 'company', 'detachment', 'headquarters', 'artillery_brigade', 'artillery_battalion', 'artillery_group', 'group', 'command', 'other')

BASES = {
    'roster': {'organization_table': 'listed in the organization table', 'report_heading': 'named in the heading or signature of a report', 'report_text': 'named in the text of a report',
               'casualty_return': 'listed in a return of casualties', 'abstract_return': 'listed in an abstract from returns', 'footnote': 'stated in a footnote of a table', 'state_volume': 'a state volume names it'},
    'commander': {'organization_table': 'listed in the organization table (first named = commander at the start, later names = succession)', 'report_signature': 'signed a report as commanding',
                  'report_text': 'named as commanding in the text of a report', 'casualty_return': 'named in a heading of a return of casualties', 'state_volume': 'a state volume names him', 'abstract_return': 'named in an abstract from returns'},
    'officer': {'report_text': 'named in a report', 'casualty_list': 'named in a list of casualties', 'organization_table': 'named in the organization table', 'state_volume': 'named in a state volume'},
    'strength': {'taken_into_action': 'the report says the unit went into action with N', 'present_for_duty': 'present for duty on the date of a return', 'effective_total': 'effective total of a return',
                 'aggregate_present': 'aggregate present of a return', 'aggregate_present_and_absent': 'aggregate present and absent', 'estimate_in_report': 'an estimate or round figure given in a report ("about", "less than")',
                 'muster_or_roll': 'from muster or roll counts', 'derived': 'computed from other lines (see derived_from)'},
    'casualties': {'casualty_return': 'a row of the Return of Casualties', 'report_statement': 'stated in a report', 'corrected_return': 'a corrected or revised return', 'state_volume': 'a state volume prints it', 'derived': 'computed from other lines'},
    'arms': {'report_text': 'stated in a report', 'ordnance_return': 'stated in an ordnance or inspection return', 'regimental_history': 'a regimental history prints it', 'state_volume': 'a state volume prints it', 'derived': 'computed from other lines'},
    'guns': {'report_text': 'stated in a report', 'organization_table': 'stated in an organization table', 'ordnance_return': 'stated in an ordnance return', 'casualty_return': 'stated in a return', 'state_volume': 'a state volume prints it', 'derived': 'computed from other lines'},
    'dress': {'report_text': 'stated in a report', 'state_volume': 'a state volume prints it', 'regimental_history': 'a regimental history prints it', 'newspaper_1863': 'an 1863 newspaper prints it', 'derived': 'computed from other lines'},
    'horses': {'report_text': 'stated in a report', 'return': 'stated in a return', 'derived': 'computed from other lines'},
    'ammunition': {'report_text': 'stated in a report', 'return': 'stated in a return', 'derived': 'computed from other lines'},
    'detachment': {'organization_table': 'stated in the organization table', 'footnote': 'stated in a footnote', 'report_text': 'stated in a report', 'state_volume': 'a state volume prints it'},
}
QUOTE_MODES = {
    'exact': 'the quote is the text of the source (whitespace collapsed); it must be found, exactly and case-sensitively, at the stated offset',
    'ocr_corrected': 'the quote is the text with OCR errors corrected after reading the scanned page; it must match the source text closely at the stated offset (image block required)',
    'image_row': 'a row of a printed table whose figures were read from the scanned page; the quote is the printed row label as the OCR has it (exact); the figures are in value and are checked arithmetically (image block required)',
}
QUOTE_MIN, QUOTE_MAX = 12, 600

# --- a tiny schema language for the value of a line ------------------------------------------------------------------
INT, STR, BOOL, DATE = ('int',), ('str',), ('bool',), ('date',)


def i(lo=0, hi=2000000):
    return ('int', lo, hi)


def s(maxlen=400):
    return ('str', maxlen)


def en(*vals):
    return ('enum', tuple(vals))


def lst(item, lo=0, hi=60):
    return ('list', item, lo, hi)


def obj(req=None, opt=None):
    return ('obj', req or {}, opt or {})


def nul(t):
    return ('null', t)


SHARE = nul(en(*SHARES))
DATE_T = ('date',)
KILLED_T = obj(opt={'officers': nul(i()), 'enlisted': nul(i())})
WEAPON_ITEM = obj(req={'printed': s(300)}, opt={'weapon_id': nul(s(80)), 'caliber_in': nul(('num', 0.2, 12.0)), 'share': SHARE, 'count': nul(i()), 'companies': nul(s(40)), 'note': s(300)})
DRESS_ITEM = obj(req={'printed': s(300)}, opt={'item_id': nul(s(80)), 'share': SHARE, 'note': s(300)})
PIECE = obj(req={'printed': s(200), 'count': nul(i(0, 400))}, opt={'type_id': nul(s(80)), 'type_candidates': lst(s(80), 0, 8), 'note': s(300)})

FIELD_SPECS = {
    'roster': obj(req={'designation': s(200), 'kind': en(*UNIT_KINDS)},
                  opt={'place': s(300), 'engaged': en('yes', 'no', 'partly', 'not_stated'), 'detail': s(400)}),
    'commander': obj(req={'name': s(120), 'rank': s(60), 'order': i(1, 20)},
                     opt={'rank_printed': s(60), 'role': s(80), 'from': nul(DATE_T), 'to': nul(DATE_T),
                          'change': nul(obj(req={'event': en('killed', 'mortally_wounded', 'wounded', 'captured', 'relieved', 'assumed_command', 'temporarily_absent', 'died', 'other')},
                                            opt={'date': nul(DATE_T), 'detail': s(300)})), 'note': s(300)}),
    'officer': obj(req={'name': s(120), 'rank': s(60), 'role': en('field', 'staff', 'company', 'aide', 'chief_of_artillery', 'surgeon', 'other')},
                   opt={'rank_printed': s(60), 'company': nul(s(10)), 'event': nul(en('killed', 'mortally_wounded', 'wounded', 'captured', 'missing', 'other')), 'note': s(300)}),
    'strength': obj(req={'low': i(), 'high': i(), 'men': en('officers_and_men', 'enlisted_only', 'officers_only', 'rank_and_file', 'aggregate', 'not_stated')},
                    opt={'officers': nul(i()), 'enlisted': nul(i()), 'companies': nul(i(1, 20)), 'scope': s(120), 'text_figure': s(160), 'note': s(300)}),
    'casualties': obj(req={'killed': KILLED_T, 'wounded': KILLED_T, 'missing': KILLED_T, 'total': nul(i()), 'period': s(60)},
                      opt={'scope': s(120), 'row': lst(nul(i()), 0, 12), 'label_read': s(160), 'note': s(300)}),
    'arms': obj(req={'weapons': lst(WEAPON_ITEM, 1, 12)}, opt={'exchange': s(300), 'note': s(300)}),
    'guns': obj(req={'pieces': lst(PIECE, 1, 12), 'total': nul(i(0, 400)), 'state': en('present', 'engaged', 'lost', 'captured', 'disabled', 'recovered', 'detached')},
                opt={'scope': en('battery', 'section', 'battalion', 'brigade', 'corps', 'other'), 'note': s(300)}),
    'dress': obj(req={'items': lst(DRESS_ITEM, 1, 12)}, opt={'statement': s(400), 'note': s(300)}),
    'horses': obj(opt={'present': nul(i()), 'serviceable': nul(i()), 'unserviceable': nul(i()), 'lost': nul(i()), 'killed': nul(i()), 'note': s(300)}),
    'ammunition': obj(opt={'rounds_expended': nul(i()), 'rounds_on_hand': nul(i()), 'by_type': ('map', i()), 'note': s(300)}),
    'detachment': obj(opt={'companies_absent': lst(s(12), 0, 20), 'companies_present': nul(i(0, 40)), 'attached': nul(s(300)), 'strength_includes_detachment': nul(BOOL), 'detail': s(400)}),
}
# value paths whose numbers must be found in the quote of a text-mode documented line (derived totals are exempt)
NUMBER_PATHS = {
    'strength': ['officers', 'enlisted', 'low', 'high'],
    'casualties': ['killed.officers', 'killed.enlisted', 'wounded.officers', 'wounded.enlisted', 'missing.officers', 'missing.enlisted'],
    'guns': ['pieces.*.count'],
    'horses': ['present', 'serviceable', 'unserviceable', 'lost', 'killed'],
    'ammunition': ['rounds_expended', 'rounds_on_hand'],
    'detachment': ['companies_present'],
}
CONFLICT_RE = re.compile(r'^[a-z0-9][a-z0-9:_.\-|]{3,160}$')
ID_RE = re.compile(r'^[a-z0-9][a-z0-9\-]{1,60}:[0-9]{3,6}$')
DATE_RE = re.compile(r'^(18[56][0-9])-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T([01][0-9]|2[0-3]):[0-5][0-9])?(/(18[56][0-9])-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T([01][0-9]|2[0-3]):[0-5][0-9])?)?$')

ERRORS = collections.OrderedDict([
    ('JSON', 'the line is not a JSON object'), ('TYPE', 'type is not one of evidence, gap, source'), ('KEYS', 'a key is missing or not allowed for this line type'),
    ('ID', 'id is missing, malformed (<group>:<4 digits>), duplicated or of another group'), ('UNIT', 'unit_id is not a unit of this group (use unit_id null with unit_name and parent_unit_id for a unit the plan lacks)'),
    ('FIELD', 'field is not in the vocabulary'), ('KITFIELD', 'kit_field is required for arms and dress and must be one of the kit fields of that field'), ('TIER', 'tier is not allowed here'),
    ('BASIS', 'basis is not a token of this field'), ('VALUE', 'value does not fit the schema of the field'), ('DATE', 'as_of or a date inside value is not an ISO date, minute or range'),
    ('SOURCE', 'source_id is not in sources.json and not declared by a source line'), ('LEAD', 'a documented or inferred line cites a lead-class source'),
    ('PART', 'part does not match the source (1, 2 or 3 for Official Records, null otherwise)'), ('QUOTE', 'quote is missing, too short or too long'), ('QUOTE_NOT_FOUND', 'the quote is not in the source text'),
    ('OFFSET', 'offset is missing or is not where the quote starts'), ('PAGE', 'printed_page does not match the leaf map (or the page model of the volume)'), ('REPORT', 'report_id is not the report (or section) that contains the quote'),
    ('NUMBERS', 'a number of value is not in the quote (spelled-out numbers count); use quote_mode image_row or ocr_corrected, or waive_numbers with the reason'), ('IMAGE', 'quote_mode needs an image block (pdf_page, dpi) and a row where the mode says so'),
    ('CHECK', 'an arithmetic identity of a table row fails (the figures were misread)'), ('DERIVED', 'a derived or inferred line has no derived_from or note, or cites an unknown line'), ('SUPERSEDES', 'supersedes names an unknown line'),
    ('CONFLICT', 'conflict is malformed, or two active lines of one quantity disagree and no conflict is declared'), ('GAP', 'a gap line needs searched (source ids and terms) and result'), ('DECLARE', 'a source declaration is malformed or its file is missing or its sha256 differs'),
    ('PROCEDURAL', 'a plausible-procedural line needs a note and a register_proposal'), ('TABLE', 'a documented line quotes a table row whose figures the OCR scrambled: use quote_mode image_row'),
])
WARNINGS = collections.OrderedDict([
    ('OCR_CORRECTED', 'quote_mode ocr_corrected: the quote differs from the OCR text; a reviewer re-reads the page image'), ('HYPHEN', 'the quote matched only with line-end hyphenation ignored'),
    ('PAGE_END', 'the quote runs over a page break; give printed_page_end'), ('PAGE_UNCHECKED', 'the page model of this source gives no page at this offset; the page is not checked'), ('REPORT_EDGE', 'the quote lies within 2,000 characters of the edge of the indexed report'),
    ('UNIT_FIELD', 'the field is unusual for this kind of unit'), ('LONG_QUOTE', 'the quote is long; the shortest passage that supports the claim is better'), ('NUMBERS_WAIVED', 'the number check was waived'),
    ('OFF_FIELD', 'the date is outside 26 June to 16 July 1863 (fine for background facts)'), ('KIT_NOW', 'information only (--diff): what the kit tables hold now for this unit and field'),
])
ALLOWED_KEYS = {
    'evidence': {'type', 'id', 'unit_id', 'unit_name', 'parent_unit_id', 'field', 'kit_field', 'value', 'basis', 'basis_note', 'tier', 'as_of', 'source_id', 'part', 'report_id', 'printed_page', 'printed_page_end', 'offset', 'quote',
                 'quote_mode', 'image', 'checks', 'conflict', 'supersedes', 'derived_from', 'note', 'register_proposal', 'waive_numbers', 'example'},
    'gap': {'type', 'id', 'unit_id', 'unit_ids', 'field', 'fields', 'kit_field', 'searched', 'result', 'note', 'register_proposal', 'example'},
    'source': {'type', 'id', 'title', 'class', 'local_path', 'sha256', 'url', 'page_model', 'part', 'lead', 'note', 'example'},
}
REQUIRED_KEYS = {
    'evidence': {'type', 'id', 'unit_id', 'field', 'value', 'basis', 'tier', 'source_id', 'quote'},
    'gap': {'type', 'id', 'field', 'searched', 'result'},
    'source': {'type', 'id', 'title', 'class', 'local_path'},
}
DECLARABLE_CLASSES = ('official_records', 'state_or_commission_report', 'statistical_compilation', 'regimental_or_state_history', 'participant_account', 'period_or_later_history', 'period_newspaper', 'primary_manual', 'primary_report',
                      'wikipedia', 'forum', 'blog', 'auction', 'memory', 'unsourced_web_page')
LEAD_CLASSES = ('wikipedia', 'forum', 'blog', 'auction', 'memory', 'unsourced_web_page')


# ---------------------------------------------------------------------------------------------------------------------
# schema checking
def check_value(t, v, path, errs):
    kind = t[0]
    if kind == 'null':
        if v is None:
            return
        return check_value(t[1], v, path, errs)
    if kind == 'int':
        lo, hi = (t[1], t[2]) if len(t) > 1 else (0, 2000000)
        if isinstance(v, bool) or not isinstance(v, int):
            errs.append('%s: an integer is required' % path)
        elif v < lo or v > hi:
            errs.append('%s: %s is outside %s..%s' % (path, v, lo, hi))
    elif kind == 'num':
        if isinstance(v, bool) or not isinstance(v, (int, float)) or v < t[1] or v > t[2]:
            errs.append('%s: a number between %s and %s is required' % (path, t[1], t[2]))
    elif kind == 'str':
        ml = t[1] if len(t) > 1 else 400
        if not isinstance(v, str) or not v.strip():
            errs.append('%s: a non-empty string is required' % path)
        elif len(v) > ml:
            errs.append('%s: longer than %d characters' % (path, ml))
    elif kind == 'bool':
        if not isinstance(v, bool):
            errs.append('%s: true or false is required' % path)
    elif kind == 'date':
        if not isinstance(v, str) or not DATE_RE.match(v):
            errs.append('%s: an ISO date (YYYY-MM-DD, optionally THH:MM, optionally a range a/b) is required' % path)
    elif kind == 'enum':
        if v not in t[1]:
            errs.append('%s: %r is not one of %s' % (path, v, ', '.join(map(str, t[1]))))
    elif kind == 'list':
        if not isinstance(v, list):
            errs.append('%s: a list is required' % path)
        elif not (t[2] <= len(v) <= t[3]):
            errs.append('%s: %d entries, %d to %d required' % (path, len(v), t[2], t[3]))
        else:
            for k, x in enumerate(v):
                check_value(t[1], x, '%s[%d]' % (path, k), errs)
    elif kind == 'map':
        if not isinstance(v, dict):
            errs.append('%s: an object is required' % path)
        else:
            for k, x in v.items():
                check_value(t[1], x, '%s.%s' % (path, k), errs)
    elif kind == 'obj':
        if not isinstance(v, dict):
            errs.append('%s: an object is required' % path)
            return
        for k in t[1]:
            if k not in v:
                errs.append('%s.%s: missing' % (path, k))
        for k, x in v.items():
            spec = t[1].get(k) or t[2].get(k)
            if spec is None:
                errs.append('%s.%s: not a key of this value (allowed: %s)' % (path, k, ', '.join(list(t[1]) + list(t[2]))))
            else:
                check_value(spec, x, '%s.%s' % (path, k), errs)


def value_numbers(field, v):
    """The integers of a value that the quote must contain (see NUMBER_PATHS); derived totals are exempt."""
    out = []
    for p in NUMBER_PATHS.get(field, []):
        cur = [v]
        for part in p.split('.'):
            nxt = []
            for c in cur:
                if part == '*' and isinstance(c, list):
                    nxt += c
                elif isinstance(c, dict) and part in c:
                    nxt.append(c[part])
            cur = nxt
        out += [x for x in cur if isinstance(x, int) and not isinstance(x, bool) and x > 0]
    if field == 'strength' and isinstance(v, dict) and isinstance(v.get('officers'), int) and isinstance(v.get('enlisted'), int):
        tot = v['officers'] + v['enlisted']
        out = [x for x in out if x != tot or x in (v['officers'], v['enlisted'])]
    return sorted(set(out))


# ---------------------------------------------------------------------------------------------------------------------
# numbers in text (digits and spelled-out numbers)
_UNITS = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
          'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19}
_TENS = {'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}


def numbers_in_text(t):
    nums = set()
    for m in re.finditer(r'\d{1,3}(?:,\d{3})+|\d+', t):
        nums.add(int(m.group().replace(',', '')))
    toks = []
    for m in re.finditer(r"[A-Za-z]+(?:-[A-Za-z]+)*", t.lower()):
        toks += m.group().split('-')
    i_, n = 0, len(toks)
    while i_ < n:
        w = toks[i_]
        if w in _UNITS or w in _TENS or w == 'hundred' or (w == 'a' and i_ + 1 < n and toks[i_ + 1] in ('hundred', 'thousand')):
            total, cur, j, seen = 0, 0, i_, False
            while j < n:
                w = toks[j]
                if w in _UNITS:
                    cur += _UNITS[w]
                elif w in _TENS:
                    cur += _TENS[w]
                elif w == 'a' and j + 1 < n and toks[j + 1] in ('hundred', 'thousand') and cur == 0:
                    cur = 1
                elif w == 'hundred':
                    cur = max(cur, 1) * 100
                elif w == 'thousand':
                    total += max(cur, 1) * 1000
                    cur = 0
                elif w == 'and' and seen and j + 1 < n and (toks[j + 1] in _UNITS or toks[j + 1] in _TENS):
                    pass
                else:
                    break
                seen = True
                nums.add(total + cur)
                if w in _UNITS or w in _TENS:
                    nums.add(_UNITS.get(w) or _TENS.get(w))
                j += 1
            i_ = max(j, i_ + 1)
        else:
            i_ += 1
    return nums


# ---------------------------------------------------------------------------------------------------------------------
# sources
FOLD = str.maketrans({'’': "'", '‘': "'", '`': "'", '´': "'", '“': '"', '”': '"', '—': '-', '–': '-', '−': '-'})


def norm(q):
    return ' '.join(q.translate(FOLD).split())


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


_REG = {}


def registry(reload=False):
    if reload or 'doc' not in _REG:
        p = os.path.join(EV, 'sources.json')
        if not os.path.exists(p):
            raise SystemExit('sources.json is missing: run python tools/bt/kit_evidence_plan.py')
        with open(p, encoding='utf-8') as f:
            _REG['doc'] = json.load(f)
    return _REG['doc']['sources']


class Source:
    """A citable text with its normalized view, offset map, page model and record (report or section) model."""

    def __init__(self, sid, rec):
        self.id, self.rec = sid, rec
        self.path = os.path.join(ROOT, rec['local_path'])
        self.kind = 'or27' if rec.get('index') == 'or27' else 'statevol' if str(rec.get('index') or '').startswith('statevol:') else 'plain'
        self.part = rec.get('part')
        self.leafmap = self.P = self.V = None
        self._load()
        self.f = self.ntext.translate(FOLD)
        self._raw = None

    def _load(self):
        if not os.path.exists(self.path):
            raise FileNotFoundError('source text missing: %s' % self.rec['local_path'])
        if self.kind == 'or27':
            import or27_find as F
            import kit_or27_leafmap as L
            self.P = F.get_part(self.part)
            self.ntext, self.nmap = self.P.ntext, self.P.nmap
            self.leafmap = L.load(self.part)
        elif self.kind == 'statevol':
            import statevol_find as SV
            try:
                self.V = SV.Vol(self.rec['index'].split(':', 1)[1], SV.index())
                self.ntext, self.nmap = self.V.ntext, self.V.nmap
                return
            except Exception:                                   # the volume is not under tmp/library/misc: fall back to a plain view
                self.V = None
                self.kind = 'plain'
        if self.kind == 'plain':
            os.makedirs(CACHE, exist_ok=True)
            key = os.path.join(CACHE, 'plain_%s_%s_v1.pkl' % (re.sub(r'[^A-Za-z0-9._-]', '_', self.id)[:60], (self.rec.get('sha256') or '')[:16]))
            got = None
            if os.path.exists(key):
                try:
                    with open(key, 'rb') as f:
                        got = pickle.load(f)
                except Exception:
                    got = None
            if got is None:
                from or27_lib import build_nview
                with open(self.path, encoding='utf-8', newline='') as f:
                    raw = f.read()
                nt, nm = build_nview(raw, None)
                got = (nt, list(nm))
                tmp = key + '.%d.tmp' % os.getpid()
                with open(tmp, 'wb') as f:
                    pickle.dump(got, f, protocol=4)
                os.replace(tmp, key)
            self.ntext, self.nmap = got

    @property
    def raw(self):
        if self._raw is None:
            with open(self.path, encoding='utf-8', newline='') as f:
                self._raw = f.read()
        return self._raw

    # -- locating ---------------------------------------------------------------------------------------------------
    def locate(self, quote, limit=40):
        """All places where the normalized quote occurs: [{start, end, via}] with ORIGINAL offsets. via: exact | hyphen."""
        q = norm(quote)
        out = []
        p = self.f.find(q)
        while p >= 0 and len(out) < limit:
            out.append({'start': int(self.nmap[p]), 'end': int(self.nmap[p + len(q) - 1]) + 1, 'via': 'exact', 'n': p})
            p = self.f.find(q, p + 1)
        if not out and ('-' in q):
            rx = re.compile(''.join('-?' if c == '-' else (r'\s+' if c == ' ' else re.escape(c)) for c in q))
            for m in rx.finditer(self.f):
                out.append({'start': int(self.nmap[m.start()]), 'end': int(self.nmap[m.end() - 1]) + 1, 'via': 'hyphen', 'n': m.start()})
                if len(out) >= limit:
                    break
        return out

    def locate_ci(self, quote):
        q = norm(quote)
        m = re.search(re.escape(q), self.f, re.I)
        return int(self.nmap[m.start()]) if m else None

    def fuzzy(self, quote, near, radius=4000, floor=0.88):
        """Best token-wise alignment of an OCR-corrected quote near an offset: {start, end, score} or None."""
        import difflib
        qt = norm(quote).split()
        if len(qt) < 3:
            return None
        k = bisect.bisect_left(self.nmap, max(0, near - radius))
        e = bisect.bisect_right(self.nmap, near + radius)
        win = self.f[k:e]
        toks = [(m.group(), k + m.start()) for m in re.finditer(r'\S+', win)]
        best = None
        for a in range(0, max(1, len(toks) - len(qt) + 1)):
            seg = toks[a:a + len(qt)]
            if len(seg) < len(qt):
                break
            sc = []
            for x, (y, _o) in zip(qt, seg):
                sc.append(1.0 if x == y else difflib.SequenceMatcher(None, x, y).ratio())
            mean = sum(sc) / len(sc)
            if mean >= floor and min(sc) >= 0.5 and (best is None or mean > best[0]):
                best = (mean, seg[0][1], seg[-1][1] + len(seg[-1][0]))
        if not best:
            return None
        return {'score': round(best[0], 3), 'start': int(self.nmap[best[1]]), 'end': int(self.nmap[min(best[2] - 1, len(self.nmap) - 1)]) + 1}

    # -- pages and records ------------------------------------------------------------------------------------------
    def page_at(self, off):
        """(page or None, lo, hi, note). The Official Records use the scan-leaf map; state volumes the running-head anchors."""
        if self.kind == 'or27' and self.leafmap:
            r = self.leafmap.at(off)
            if r and isinstance(r['page'], int):
                return r['page'], r['page'], r['page'], 'leaf %s' % r['leaf']
            return None, None, None, 'leaf %s has no printed page number (front matter or plate)' % (r['leaf'] if r else '?')
        if self.kind == 'statevol' and self.V:
            label, interp = self.V.pm.page_at(off)
            m = re.match(r'^(\d+)(?:~(\d+))?$', str(label or ''))
            if m:
                lo = int(m.group(1))
                hi = int(m.group(2)) if m.group(2) else lo
                return (None if interp and hi != lo else lo), lo, hi, 'running heads%s' % (' (interpolated)' if interp else '')
            return None, None, None, 'no page anchor'
        return None, None, None, 'no page model'

    def record_at(self, off):
        """(record id or None, start, end) of the report (Official Records) or section (state volumes) that contains the offset."""
        if self.kind == 'or27' and self.P:
            r = self.P.record_at(off)
            if r:
                return r['id'], r['start_offset'], r['end_offset']
            return None, None, None
        if self.kind == 'statevol' and self.V:
            sec = self.V.section_at(off)
            if sec:
                return sec['id'], sec['start'], sec['end']
        return None, None, None

    def window(self, off, before=0, after=400):
        return self.raw[max(0, off - before): off + after]


_SRC = {}


def get_source(sid, declared=None):
    if sid in _SRC:
        return _SRC[sid]
    reg = registry()
    rec = reg.get(sid) or (declared or {}).get(sid)
    if rec is None:
        raise KeyError(sid)
    _SRC[sid] = Source(sid, rec)
    return _SRC[sid]


def groups_doc():
    with open(os.path.join(EV, 'groups.json'), encoding='utf-8') as f:
        return json.load(f)


def unit_index():
    d = groups_doc()
    out = {}
    for g in d['groups']:
        for u in g['units']:
            out[u['unit_id']] = (g, u)
    return d, out


# ---------------------------------------------------------------------------------------------------------------------
# page images (Official Records scans)
def render_page(sid, page, dpi=130, outdir=None):
    reg = registry()
    rec = reg.get(sid)
    if not rec or rec.get('index') != 'or27':
        raise SystemExit('page images exist for the Official Records parts only (OR27-1, OR27-2, OR27-3)')
    pdf = os.path.join(ROOT, rec['pdf'])
    if not os.path.exists(pdf):
        raise SystemExit('scan PDF missing: %s (fetch: curl -sS -L -o %s https://archive.org/cors/%s/%s.pdf)' % (rec['pdf'], rec['pdf'], rec['archive_identifier'], rec['archive_identifier']))
    import kit_or27_leafmap as L
    leaf = L.load(rec['part']).leaf_of_page(int(page))
    if leaf is None:
        raise SystemExit('printed page %s is not in part %d' % (page, rec['part']))
    outdir = outdir or os.path.join(ROOT, 'tmp', 'kit-plan', 'img')
    os.makedirs(outdir, exist_ok=True)
    pre = os.path.join(outdir, 'or27p%d-p%04d-d%d' % (rec['part'], int(page), dpi))
    n = leaf + 1                                                  # PDF page = leaf + 1
    subprocess.run(['pdftoppm', '-f', str(n), '-l', str(n), '-r', str(dpi), '-png', '-singlefile', pdf, pre], check=True)
    return pre + '.png', leaf, n


# ---------------------------------------------------------------------------------------------------------------------
# examples (the same lines the PLAN prints; checked by the self-test)
def template(field):
    base = {'type': 'evidence', 'id': '<group>:0001', 'unit_id': '<unit id from groups.json>', 'field': field, 'tier': 'documented', 'source_id': 'OR27-1', 'part': 1, 'report_id': 'OR27-1-R0xx', 'printed_page': 0, 'offset': 0,
            'quote': '<the passage, copied from the source>', 'quote_mode': 'exact', 'as_of': '1863-07-01'}
    ex = {
        'roster': ({'designation': '19th Indiana', 'kind': 'regiment', 'place': 'First Brigade, First Division, First Army Corps', 'engaged': 'yes'}, 'organization_table'),
        'commander': ({'name': 'Samuel J. Williams', 'rank': 'Colonel', 'rank_printed': 'Col.', 'order': 1, 'role': 'commanding'}, 'organization_table'),
        'officer': ({'name': 'Albert M. Edwards', 'rank': 'Captain', 'role': 'field', 'event': None}, 'report_text'),
        'strength': ({'low': 252, 'high': 252, 'men': 'officers_and_men', 'officers': 17, 'enlisted': 235, 'scope': 'regiment'}, 'taken_into_action'),
        'casualties': ({'killed': {'officers': 2, 'enlisted': 25}, 'wounded': {'officers': 12, 'enlisted': 121}, 'missing': {'officers': 4, 'enlisted': 46}, 'total': 210, 'period': '1863-07-01/1863-07-03', 'row': [2, 25, 12, 121, 4, 46, 210]}, 'casualty_return'),
        'arms': ({'weapons': [{'printed': 'Springfield rifled muskets', 'weapon_id': 'm1861_springfield', 'share': 'all'}]}, 'report_text'),
        'guns': ({'pieces': [{'printed': 'six 12-pounders', 'count': 6, 'type_id': None, 'type_candidates': ['napoleon_12pdr_m1857', '12pdr_howitzer']}], 'total': 6, 'state': 'engaged', 'scope': 'battery'}, 'report_text'),
        'dress': ({'items': [{'printed': 'gray jackets', 'item_id': None, 'share': 'most'}]}, 'report_text'),
        'horses': ({'present': None, 'serviceable': 303, 'unserviceable': 191, 'lost': None}, 'report_text'),
        'ammunition': ({'rounds_expended': 700, 'by_type': {'shell': 200, 'canister': 100}}, 'report_text'),
        'detachment': ({'companies_absent': ['A', 'K'], 'companies_present': 8, 'strength_includes_detachment': False}, 'report_text'),
    }
    if field not in ex:
        raise SystemExit('fields: ' + ', '.join(FIELDS))
    base['value'], base['basis'] = ex[field]
    if field in ('arms', 'dress'):
        base['kit_field'] = 'weapon' if field == 'arms' else 'headgear'
    return base


# ---------------------------------------------------------------------------------------------------------------------
# commands
def _print_hit(src, m, ctx, label=None):
    page, lo, hi, note = src.page_at(m['start'])
    rid, rs, re_ = src.record_at(m['start'])
    pg = page if page is not None else ('%s-%s' % (lo, hi) if lo is not None else None)
    print('[%s] part=%s report_id=%s printed_page=%s offset=%d (%s)' % (src.id, src.part, rid, pg, m['start'], note))
    a = max(0, m['n'] - ctx) if 'n' in m else 0
    q = src.ntext[m['n']:m['n'] + (m['end'] - m['start'])] if 'n' in m else ''
    print('   ...%s<<%s>>%s...' % (src.ntext[a:m['n']] if 'n' in m else '', q, src.ntext[m['n'] + len(q): m['n'] + len(q) + ctx] if 'n' in m else ''))


def cmd_find(argv):
    import argparse
    ap = argparse.ArgumentParser(prog='find')
    ap.add_argument('source_id')
    ap.add_argument('pattern')
    ap.add_argument('-C', '--context', type=int, default=160)
    ap.add_argument('--max', type=int, default=20)
    ap.add_argument('--case', action='store_true')
    a = ap.parse_args(argv)
    src = get_source(a.source_id)
    rx = re.compile(a.pattern, 0 if a.case else re.I)
    n = 0
    for m in rx.finditer(src.f):
        if m.end() == m.start():
            continue
        mm = {'start': int(src.nmap[m.start()]), 'end': int(src.nmap[m.end() - 1]) + 1, 'n': m.start()}
        page, lo, hi, note = src.page_at(mm['start'])
        rid, _s, _e = src.record_at(mm['start'])
        pg = page if page is not None else ('%s-%s' % (lo, hi) if lo is not None else None)
        a0, b0 = max(0, m.start() - a.context), min(len(src.ntext), m.end() + a.context)
        print('[%s part=%s report_id=%s printed_page=%s offset=%d]' % (src.id, src.part, rid, pg, mm['start']))
        print('   ...%s<<%s>>%s...' % (src.ntext[a0:m.start()], src.ntext[m.start():m.end()], src.ntext[m.end():b0]))
        n += 1
        if n >= a.max:
            print('(max %d hits)' % a.max)
            break
    print('%d hit(s)' % n)
    return 0 if n else 2


def cmd_cite(argv):
    import argparse
    ap = argparse.ArgumentParser(prog='cite')
    ap.add_argument('source_id')
    ap.add_argument('quote')
    ap.add_argument('--offset', type=int, default=None)
    a = ap.parse_args(argv)
    src = get_source(a.source_id)
    hits = src.locate(a.quote)
    if not hits:
        ci = src.locate_ci(a.quote)
        print('NOT FOUND' + (' (a case-insensitive match exists at offset %d: copy the text exactly)' % ci if ci is not None else ' (copy the passage from the text exactly; OCR errors stay as they are, or use quote_mode ocr_corrected)'))
        return 2
    if a.offset is not None:
        hits = [h for h in hits if h['start'] == a.offset] or hits
    for h in hits[:10]:
        page, lo, hi, note = src.page_at(h['start'])
        pe, _l, _h, _n = src.page_at(max(h['start'], h['end'] - 1))
        rid, _s, _e = src.record_at(h['start'])
        out = {'source_id': src.id, 'part': src.part, 'report_id': rid, 'printed_page': page if page is not None else lo, 'offset': h['start'], 'quote': norm(a.quote)}
        if pe is not None and page is not None and pe != page:
            out['printed_page_end'] = pe
        print(json.dumps(out, ensure_ascii=False), '' if h['via'] == 'exact' else '  (matched with line-end hyphenation ignored)', '' if page is not None else '  (%s)' % note)
    if len(hits) > 1:
        print('%d places match: pass --offset to choose; the offset of an evidence line must be the one you read' % len(hits))
    return 0


def cmd_image(argv):
    import argparse
    ap = argparse.ArgumentParser(prog='image')
    ap.add_argument('source_id')
    ap.add_argument('page', type=int)
    ap.add_argument('--dpi', type=int, default=130)
    ap.add_argument('--out', default=None)
    a = ap.parse_args(argv)
    path, leaf, n = render_page(a.source_id, a.page, a.dpi, a.out)
    print(path)
    print('printed page %d = leaf %d = page %d of the scan PDF; view it with the Read tool' % (a.page, leaf, n))
    return 0


def cmd_unit(argv):
    d, idx = unit_index()
    if not argv or argv[0] not in idx:
        print('unit ids of groups.json; e.g. us-1c-1d-meredith-19in. %d units.' % len(idx))
        return 2
    g, u = idx[argv[0]]
    print('group %s: %s' % (g['id'], g['title']))
    print(json.dumps({k: v for k, v in u.items() if k not in ('fields', 'kit_fields')}, ensure_ascii=False, indent=1))
    print('required fields:', u.get('required'))
    for f, v in u['fields'].items():
        print('  %-11s %-6s %s' % (f, v[0], v[1][:150]))
    if u.get('kit_fields'):
        print('  kit fields:', ', '.join('%s=%s' % (k, x) for k, x in u['kit_fields'].items()))
    print('tables of the group:', json.dumps(g['reading_list']['tables']))
    print('reports of the group:', json.dumps(g['reading_list']['reports'])[:800])
    return 0


def cmd_sources(argv):
    reg = registry()
    for sid, r in reg.items():
        print('%-30s %-28s page_model=%-8s %9d chars  %s' % (sid, r['class'], r['page_model'], r['chars'], r['title'][:70]))
    return 0


def main(argv):
    cmds = {'find': cmd_find, 'cite': cmd_cite, 'image': cmd_image, 'unit': cmd_unit, 'sources': cmd_sources}
    if not argv or argv[0] not in list(cmds) + ['template']:
        print(__doc__)
        return 2
    if argv[0] == 'template':
        print(json.dumps(template(argv[1] if len(argv) > 1 else ''), ensure_ascii=False))
        return 0
    return cmds[argv[0]](argv[1:])


if __name__ == '__main__':
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    sys.exit(main(sys.argv[1:]))
