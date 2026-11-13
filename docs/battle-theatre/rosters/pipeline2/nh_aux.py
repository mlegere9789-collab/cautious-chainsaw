"""Second-reading fields of the New Hampshire register rows (companion of parse_nh_ayling.py).  Standard library only.

The unit files (roster2/2) carry the OCR text as printed and nothing derived.  What is derived from it is kept in a sidecar,
data2/union/nh/<unit>.aux.json.gz, one row per row of the unit file, joined by the character offset of the name:

    [off, nn, ou, kind, jr, jb, er]
      off   the offset of the name in the source text (the key; the unit file's row has the same offset)
      nn    the name in the order "Given Surname" built from the printed tokens: the tokens are only re-ordered and stripped of stray marks at their ends;
            no letter is changed, no name is completed or repaired; "" where the shape of the head does not allow it
      ou    ocr_uncertain: "" when none of the damage patterns below matches, else the codes of the patterns that match, comma separated.  An empty
            ou does not say the line is clean; it says no pattern matched
      kind  how the head was found: head, comma-lost, irregular, reviewed, bare-surname, xref
      jr    "on the rolls in July 1863": "on" inferred from printed dates, "off" inferred from printed dates, "unk" otherwise
      jb    the printed dates the inference rests on, as printed ("" for unk)
      er    "" or the locator of a printed erratum that names this man (index into the file's "errata" list)

Nothing in the sidecar says that a man was at Gettysburg; the page shows that only where a printed remark says so.
"""
import re

MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7, 'aug': 8, 'sept': 9, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
DATE_RE = re.compile(r"\b(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec)\.?,?\s+(\d{1,2})\s*[,.]?\s*['‘’`]\s*(\d\d)\b")
MON_ONLY_RE = re.compile(r"\b(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec)\.?,?\s+['‘’`]\s*(\d\d)\b")
BATTLE_START, BATTLE_END = (1863, 7, 1), (1863, 7, 3)

# ------------------------------------------------------------------ names
LEAD_MARKS = "\"'`^*[(|.-“„‘’"
TRAIL_MARKS = "\"'`^*])|:;,!?-”"
SUFFIX_RE = re.compile(r"^(?:Jr|Sr|[1-9][0-9]*(?:st|nd|rd|th|d))\.?$")
ALIAS_RE = re.compile(r"^a[A-Za-z]{2,4},?$")


def _clean(tok):
    """The token without the stray marks at its ends; a final period stays only on an initial or a suffix (L.  Jr.)."""
    t = tok.lstrip(LEAD_MARKS).rstrip(TRAIL_MARKS)
    if t.endswith('.') and not (re.fullmatch(r"[A-Z]\.", t) or SUFFIX_RE.match(t)):
        t = t.rstrip('.')
    return t


def normalise_name(name_tokens, kind):
    """Given-first form of the printed name; '' where the head is not regular."""
    if kind in ('irregular', 'reviewed'):
        toks = [t for t in name_tokens]
        # only when the first or second token carries the comma of "Surname, Given"
        idx = next((i for i, t in enumerate(toks[:3]) if t.endswith(',')), None)
        if idx is None:
            return ''
    else:
        toks = [t for t in name_tokens]
    if kind in ('xref', 'bare-surname'):
        return _clean(toks[0]).rstrip('.') if toks else ''
    surname_end = next((i for i, t in enumerate(toks) if t.endswith(',') or t.endswith('!')), None)
    if surname_end is None:
        if kind == 'comma-lost' or len(toks) >= 2:
            surname_end = 0                     # "Bean  Lyman  W." or "Hall.  Charles.": the first token is the surname
        else:
            return ''
    sur = [_clean(t).rstrip('.') for t in toks[:surname_end + 1]]
    given = toks[surname_end + 1:]
    cut = next((i for i, t in enumerate(given) if ALIAS_RE.match(t.strip(LEAD_MARKS))), None)
    if cut is not None:
        given = given[:cut]
    suffix = []
    g = []
    for t in given:
        c = _clean(t)
        if not c or not re.search(r'[A-Za-z]', c):
            continue
        if SUFFIX_RE.match(c):
            suffix.append(c if c.endswith('.') or c[0].isdigit() else c + '.')
            continue
        g.append(c)
    out = ' '.join(g + [' '.join(x for x in sur if x)] + suffix).strip()
    return re.sub(r'\s+', ' ', out)


# ------------------------------------------------------------------ OCR damage patterns
OK_PREFIX = ('Mc', 'Mac', 'De', 'Di', 'Da', 'La', 'Le', 'Van', 'Von', 'Fitz', "O'", 'St')
GARBAGE_CHARS = set('^|~{}<>•■°»«¬§¿„“”')


def ocr_flags(name_toks, remarks, co, anchor_kind, kind, unit_kind):
    """Codes of the damage patterns that match the printed line (see the module docstring for the meaning of an empty result)."""
    codes = []
    if kind in ('irregular', 'comma-lost', 'reviewed', 'bare-surname', 'anchorless'):
        codes.append('head')
    if kind != 'xref':
        for t in name_toks:
            core = t.strip(LEAD_MARKS + TRAIL_MARKS)
            if re.search(r"[0-9^|*`;:\[\]()\"{}<>]", t):
                codes.append('name-char')
                break
            if re.search(r"[a-z][A-Z]", core) and not core.startswith(OK_PREFIX):
                codes.append('name-case')
                break
        if name_toks and name_toks[0].strip(LEAD_MARKS) and name_toks[0].strip(LEAD_MARKS)[0].islower():
            codes.append('name-lower')
        if len(name_toks) >= 2 and not any(t.endswith(',') for t in name_toks) and kind == 'head':
            codes.append('period-for-comma')
    if unit_kind == 'co' and anchor_kind == 'company-unreadable':
        codes.append('company')
    ws = remarks.split()
    for j, w in enumerate(ws):
        if any(c in GARBAGE_CHARS for c in w) or any(ord(c) > 127 and c not in '‘’“”—–' for c in w):
            codes.append('garbage')
            break
    for w in ws:
        m = re.match(r"^['‘’`](.{1,4}?)[,;.:]?$", w)
        if m and re.fullmatch(r"[0-9OoIlSsGgBb.^}\)\]?]{1,3}", m.group(1)) and not re.fullmatch(r"6[1-6]|[7-9][0-9]", m.group(1)):
            codes.append('year')
            break
    for j, w in enumerate(ws[:-1]):
        if w == 'age' and not re.fullmatch(r"[0-9]{1,2}[;,.]?", ws[j + 1]):
            codes.append('age')
            break
    seen, out = set(), []
    for c in codes:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return ','.join(out)


# ------------------------------------------------------------------ roll status in July 1863
def _dates(text):
    """Dates printed as  Mon. D, 'YY .  Only a day 1..31 and a year 61..99 count as a date; anything else is damage and is not returned."""
    out = []
    for m in DATE_RE.finditer(text):
        mon = MONTHS[m.group(1).lower()]
        day, yr = int(m.group(2)), int(m.group(3))
        if 1 <= day <= 31 and 61 <= yr <= 99:
            out.append((m.start(), (1800 + yr, mon, day), m.group(0)))
    return out


YEAR_TOKEN_RE = re.compile(r"['\u2018\u2019`]\s*(?=[0-9OoIlSsGgBb.^}\)\]?]{0,2}[0-9])[0-9OoIlSsGgBb.^}\)\]?]{1,3}\b")


def _clauses(remarks):
    """Split the printed remarks into clauses at the semicolons and at the full stops that end a dated event ("Died, dis. Aug. 4, '61, Keene.")."""
    parts = re.split(r"\s*;\s*", remarks)
    out = []
    for p in parts:
        out.extend([q for q in re.split(r"(?<=[a-z0-9])\.\s+(?=(?:Died|P\.\s*[O0]\.|N\.\s*f\.|See|Supposed|Heirs)\b)", p) if q.strip()])
    return out


SEP_RE = re.compile(r"^(?:disch\b|dischd|dishon|dis\.?\s*disch|des\b|died\b|killed\b|dismissed\b|resigned\b|dropped\b|tr\.(?!\s*to\s+Co\.)|must[,.]?\s*out\b|nmst[,.]?\s*out\b|mnst[,.]?\s*out\b|released\b|sent\b|"
                    r"drowned\b|executed\b|shot\b|discharged\b)", re.I)
RETURN_RE = re.compile(r"^(?:gd\.\s*from|returned|appreh|joined|voluntarily|restored|rejoined|re-enl\b|re-?\s*enl\b)", re.I)
ENL_RE = re.compile(r"^(?:enl|eul|enh|ehl|etil|cnl|drafted)\b", re.I)
MUSTIN_RE = re.compile(r"^(?:must|nmst|mnst|mast|musi)[,.]?\s*in\b", re.I)


def roll_status(remarks, kind, co):
    """('on' | 'off' | 'unk', basis) from the printed enlistment and discharge dates only.
    'on'  : a printed enlistment or muster-in date on or before 30 June 1863, and no printed separation (discharge, desertion, death, transfer, muster out)
            dated before 1 July 1863, no undated separation, no return after a separation, no damaged date;
    'off' : the earliest printed enlistment or muster-in date is after 3 July 1863 (basis enl-after), or a separation is printed with a date before
            1 July 1863 and nothing returns the man afterwards (basis sep-before);
    'unk' : everything else (cross-reference lines, undated or damaged dates, doubtful cases)."""
    if kind in ('xref', 'bare-surname'):
        return 'unk', ''
    rem = remarks
    clauses = _clauses(rem)
    first_in, first_in_txt = None, ''
    seps, returns_after = [], False
    sep_seen = False
    hard = soft = False                            # damage in a date: soft = in a muster-in clause, hard = anywhere else
    for c in clauses:
        cs = c.strip()
        cs_core = re.sub(r"^(?:Co\.\s*[A-M]\s*,?\s*|F\.\s*and\s*S\.\s*,?\s*|Band\s*,?\s*|Unas'd\s*,?\s*|[A-Za-z]{0,2}nas'd\s*,?\s*)", '', cs)
        ds = _dates(cs)
        is_mustin = bool(MUSTIN_RE.match(cs_core))
        damaged_here = len(ds) < len(YEAR_TOKEN_RE.findall(cs))         # a year-like token that did not make a valid date
        if ENL_RE.match(cs_core) or is_mustin:
            if ds:
                d = ds[0][1]
                if first_in is None or d < first_in:
                    first_in, first_in_txt = d, ds[0][2]
            else:
                damaged_here = True
            if damaged_here:
                if is_mustin:
                    soft = True
                else:
                    hard = True
            continue
        if damaged_here:
            hard = True
        if re.match(r"^re-?\s*enl", cs_core, re.I) and not sep_seen:
            continue
        if RETURN_RE.match(cs_core) and sep_seen:
            returns_after = True
            continue
        if SEP_RE.match(cs_core):
            if re.search(r"promotion|to accept", cs):
                hard = True                        # a discharge to take a commission may leave the man in the same regiment
                continue
            sep_seen = True
            if ds:
                seps.append((ds[0][1], ds[0][2]))
            else:
                seps.append((None, ''))
            continue
    if first_in is None:
        return 'unk', ''
    if first_in > BATTLE_END:
        if hard:
            return 'unk', ''
        earlier = [d for _, d, _ in _dates(rem) if d < first_in]
        if earlier:
            return 'unk', ''                       # a printed date before the enlistment: one of the two is damaged
        return 'off', 'enl-after ' + first_in_txt
    if first_in >= BATTLE_START:
        return 'unk', ''
    undated = [s for s in seps if s[0] is None]
    before = [s for s in seps if s[0] is not None and s[0] < BATTLE_START]
    if before and not hard:
        if returns_after:
            return 'unk', ''
        return 'off', 'sep-before ' + before[0][1]
    if hard or soft or undated:
        return 'unk', ''
    return 'on', 'enl ' + first_in_txt


# ------------------------------------------------------------------ errata
ERRATUM_RE = re.compile(r"Page\s+([0-9\]lI]{1,4})\s*[.,]?\s*[—\-–]+\s*(.+?)(?=(?:\s+Page\s+[0-9\]lI]{1,4}\s*[.,]?\s*[—\-–])|\Z)", re.S)


def find_errata(text, leaf_span, regiment_heading_re, next_heading_re):
    """The printed Corrections of one regiment: [(offset in text, verbatim text)] from the Corrections leaf."""
    a, b = leaf_span
    seg = text[a:b]
    m = re.search(regiment_heading_re, seg)
    if not m:
        return []
    n = re.search(next_heading_re, seg[m.end():])
    sec = seg[m.end(): m.end() + (n.start() if n else len(seg) - m.end())]
    out = []
    for e in ERRATUM_RE.finditer(sec):
        out.append((a + m.end() + e.start(), re.sub(r"\s+", ' ', e.group(0)).strip()))
    return out
