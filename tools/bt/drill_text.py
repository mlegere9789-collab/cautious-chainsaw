"""Shared helpers for the drill / ordnance extraction (docs/battle-theatre/drill/).

* load(manual) -> raw OCR text (lines kept) from tmp/library/misc/*_djvu.txt
* norm(s)      -> whitespace-normalised string (all runs of whitespace -> one space)
* locate(manual, phrase) -> list of (line_no, char_offset) where the phrase occurs after normalisation
* page_of(manual, line_no) -> (printed_page, confidence, header_line_no, header_text)

Printed-page recovery: the djvu text carries the running head of every page inline ("SCHOOL OF THE SOLDIER - PART II. 43",
"44 SCHOOL OF THE SOLDIER ...", or a head line followed by a bare number line).  A header's number is read when it is
digits; OCR-garbled numbers (Tl, OU, Ill, ll6 ...) are recovered from the sequence of neighbouring headers.  Confidence:
  high      = number parsed from the header itself and it fits the sequence of the neighbouring parsed headers
  medium    = parsed, but only one neighbour fits or the neighbours disagree
  inferred  = header found but its number was unreadable; derived from the nearest readable header + count of headers between
  none      = no running head found before the passage
Nothing here is fabricated: every value is derived from OCR text and the derivation is reproducible by drill_check.py.
"""
import os, re, bisect

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'misc')

MANUALS = {
    'CASEY-1862-1': {'file': 'infantrytacticsf01brig_djvu.txt', 'title': "Casey, Infantry Tactics vol. 1 (Schools of the Soldier and Company, Skirmishers), Van Nostrand 1863 (copyright 1862)",
                      'head': r'sc\w{0,3}[ol]\s+o\w\s+t\w+|school\s+of|skir|skie|kirm|irmis|mishe|ishe'},
    'CASEY-1862-2': {'file': 'infantrytacticsf02case_djvu.txt', 'title': "Casey, Infantry Tactics vol. 2 (School of the Battalion), Van Nostrand 1862",
                      'head': r'sc\w{0,3}[ol]\s+o\w\s+t\w+|school|battal|brigade'},
    'GIBBON-1860': {'file': 'bub_gb_8FEkwTZd9FMC_djvu.txt', 'title': "Gibbon, The Artillerist's Manual, Van Nostrand 1860 (copyright 1859)", 'head': None},
    'ORDNANCE-1861': {'file': 'ordnancemanualfo00unit_djvu.txt', 'title': "The Ordnance Manual for the use of the officers of the United States Army, 2nd ed., Richmond, 1861 (reprint of the 1850 US text)", 'head': None},
    'HARDEE-1861b': {'file': 'riflelightinfant121hard_djvu.txt', 'title': "Hardee, Rifle and Light Infantry Tactics, Richmond: J. W. Randolph 1861 (vol. 1 = Schools of the Soldier and Company, Instruction for Skirmishers; vol. 2 = School of the Battalion; page numbers restart in vol. 2)",
                     'head': r'sc\w{0,3}[ol]\s+o\w\s+t\w+|school|instruction|skir|battal|table|rifle|bugle|calls', 'minupper': 0.5},
    'HARDEE-1861a': {'file': 'hardeesrifleligh01hard_djvu.txt', 'title': "Hardee, Rifle and Light Infantry Tactics complete in one volume, Memphis 1861 (OCR is poor; running-head page numbers are mostly lost, so no printed page is recovered from this copy)",
                     'head': r'sc\w{0,3}[ol]\s+o\w\s+t\w+|school|instruction|skir|battal'},
    'NY-GB-1900': {'file': 'newyorkatgettysb0001unse_djvu.txt', 'title': "New York at Gettysburg, vols. 1-2 (state monuments commission, 1900), regimental addresses", 'head': None},
    'FIELDART-1863': {'file': 'cu31924030759330_djvu.txt', 'title': "Instruction for Field Artillery (Light Artillery Board: French, Barry, Hunt), Lippincott 1863 (approved 6 March 1860)",
                      'head': r'sc\w{0,3}[ol]\s+o\w\s+t\w+|school|piece|section|battery|batteries|batt|service|pointing|ranges|organization|basis of|management|mechanical|evolution|tactic|company|detachment|manoeuv|materiel|contents|article', 'minupper': 0.35},
}

_cache = {}

# Running heads read by eye from the raw OCR where the automatic reader is blind or misreads.  (line, printed page, substring that must occur
# on that OCR line).  drill_check.py re-verifies every entry; page_of() treats these as authoritative.
EXTRA_HEADS = {
    'CASEY-1862-1': [   # heads the automatic reader misses or misreads: Hardee-comparison citations (pp. 47-51, 72) and the calls pages (pp. 214-233)
        (1870, 47, 'SCHOOL O'), (1911, 48, '48 schoo'), (1960, 49, 'SCHOOL O'), (2000, 50, '50 schoo'), (2048, 51, 'SCHOOL O'),
        (2960, 72, '72 SCHOO'), (9391, 214, '214 INST'), (9432, 215, 'INSTEUCT'), (9473, 216, '216 INST'), (9528, 217, 'INSTEUCT'),
        (9842, 223, 'IXSTEUOT'), (9855, 224, '224 SWOE'), (9890, 225, 'COLOB SA'), (9925, 226, '226 RELI'), (9962, 227, 'INSTBUCT'),
        (10013, 228, 'm CALLS '), (10071, 229, 'CALLS Ol'), (10132, 230, '230 CALL'), (10192, 231, 'SIGNALS '), (10240, 232, '232 SIGN'),
        (10286, 233, 'SIGNALS '),
    ],
    'HARDEE-1861b': [   # Randolph 1861; heads read by eye from the raw OCR (vol. 1 pp. 28-219, vol. 2 pp. 6-19); page numbers restart in vol. 2 (lines >= 9042)
        (1009, 28, '28 SCHOO'), (1047, 29, 'SCHOOL O'), (1084, 30, '30 SCHOO'), (1123, 31, 'SCHOOL O'), (1159, 32, '32 SCHOO'),
        (1194, 33, 'SCHOOL O'), (1230, 34, '34 SCHOO'), (1266, 35, 'SCHOOL O'), (1303, 36, '36 SCHOO'), (1341, 37, 'SCHOOL O'),
        (1380, 38, ",'i8 SCH"), (1416, 39, 'SCHOOL O'), (1457, 40, '4U SCHOO'), (1495, 41, 'school o'), (1533, 42, '42 SCHOO'),
        (1570, 43, 'SCHOOL O'), (1606, 44, '44 SCHOO'), (1642, 45, 'SCHOOL O'), (1680, 46, '4(i SCHO'), (1715, 47, 'SCHOOL O'),
        (1750, 48, 'SCHOOL O'), (1791, 49, 'SCHOOL O'), (1826, 50, '.jO SCHO'), (1863, 51, 'SCHOOL O'), (1898, 52, '52 SCHOO'),
        (1935, 53, 'SCHOOL O'), (1974, 54, '54 SCHOO'), (2011, 55, 'SCHOOL O'), (2051, 56, '."^n SCH'), (2091, 57, 'school o'),
        (2126, 58, '58 SCHOO'), (2164, 59, '«CIIOOL '), (2205, 60, '(•" SCII'), (2249, 61, 'SCHOOL O'), (2290, 62, 'G2 SCHOO'),
        (2335, 63, 'SCHOOL O'), (2375, 64, 'CI SCHOO'), (2417, 65, 'SCHOOL O'), (2450, 66, 'G6 SCHOO'), (2479, 67, 'SCHOOL O'),
        (2515, 68, 'G8 SCHOO'), (2554, 69, 'SCHOOL O'), (2590, 70, 'SCHOOL O'), (2627, 71, 'SCHOOL O'), (2663, 72, '72 SCHOO'),
        (2702, 73, 'SCHOOL O'), (2742, 74, '74 SCHOO'), (2778, 75, 'SCHOOL O'), (2815, 76, '76 SCHOO'), (2853, 77, 'SCHOOL O'),
        (2892, 78, '/8 SCHOO'), (2928, 79, 'SCHOOL O'), (2966, 80, '«U SCIIQ'), (3005, 81, 'SCHOOL O'), (3044, 82, '82 SCHOO'),
        (3083, 83, 'SCHOOL O'), (3117, 84, '84 SCHOO'), (3154, 85, 'SCHOOL O'), (3195, 86, '86 SCHOO'), (3231, 87, '.SCHOOL '),
        (3269, 88, 'S8 SCTIO'), (3306, 89, 'SCHOOL O'), (3358, 91, 'SCHOOL O'), (3409, 92, '92 SCHOO'), (3451, 93, 'SCHOOL O'),
        (3489, 94, '!)4 SCHO'), (3528, 95, 'SCHOOL O'), (3564, 96, ':>»j SCH'), (3603, 97, 'school o'), (3636, 98, "s'^ scho"),
        (3672, 99, 'SCHOOL O'), (3713, 100, '100 SCHO'), (3749, 101, 'SCHOOL O'), (3785, 102, '102 SCHO'), (3822, 103, 'SCHOOL O'),
        (3856, 104, '104 SCHO'), (3892, 105, 'school o'), (3927, 106, '106 SCHO'), (3969, 107, 'SCHOOL O'), (4008, 108, '108 8CHO'),
        (4041, 109, 'SCHOOL O'), (4081, 110, '110 SCHO'), (4119, 111, 'SCHOOL O'), (4158, 112, "W'i S( l"), (4196, 113, 'SCHOOL O'),
        (4233, 114, '114 SCHO'), (4272, 115, 'SCHOOL O'), (4305, 116, '110 SCHO'), (4345, 117, 'SCHOOL O'), (4387, 118, 'TUE COMP'),
        (4440, 119, 'SCHOOL O'), (6600, 169, 'SCHOOL O'), (6639, 170, '170 SCHO'), (6667, 171, 'INSTRUCT'), (6700, 172, '172 INST'),
        (6742, 173, 'INSTRUCT'), (6790, 174, '174 INST'), (6825, 175, 'INSTRUCT'), (6863, 176, '176 1N8T'), (6942, 177, 'INSTRUCT'),
        (6980, 178, '178 INST'), (7020, 179, 'INSTRUCT'), (7053, 180, '180 INST'), (7098, 181, 'INSTRUCT'), (7139, 182, '182 INST'),
        (7178, 183, 'INSTRUCT'), (7214, 184, '184 INST'), (7257, 185, 'INSTRUCT'), (7297, 186, '186 INST'), (7333, 187, 'INSTRUCT'),
        (7375, 188, '188 INST'), (7415, 189, 'INSTPtUC'), (7456, 190, '190 INRT'), (7490, 191, 'INSTRUCT'), (7528, 192, '192 INST'),
        (7565, 193, 'INSTIirc'), (7603, 194, '104 INST'), (7643, 195, 'INSTRUCT'), (7683, 196, '19G INST'), (7759, 197, 'instruct'),
        (7793, 198, '198 IXST'), (7829, 199, 'INSTRUCT'), (7869, 200, '200 INST'), (7907, 201, 'IXSTllUC'), (7945, 202, '202 INST'),
        (7984, 203, 'INSTRUCT'), (8023, 204, '201 INST'), (8061, 205, 'INSTRUCT'), (8103, 206, '20G INST'), (8142, 207, 'INSTRUCT'),
        (8179, 208, '208 INST'), (8235, 209, 'INSTRUCT'), (8274, 210, '210 INST'), (8313, 211, 'INSTRUCT'), (8354, 212, '212 INST'),
        (8419, 213, 'INSTRUCT'), (8432, 214, '•il4 -W<'), (8465, 215, 'COLOK-SA'), (8498, 216, '21 G RKL'), (8534, 217, 'INSTRUCT'),
        (8604, 218, '21.S IXS'), (8651, 219, 'INSTRUCT'), (9072, 6, '♦> SCHOO'), (9114, 7, 'SCHOOL O'), (9151, 8, '8 SCHOOL'),
        (9181, 9, 'SCHOOL O'), (9214, 10, '10 SCHOO'), (9252, 11, 'school o'), (9290, 12, '12 SCHOO'), (9329, 13, 'SCHOOL O'),
        (9368, 14, '14 .SCHO'), (9405, 15, 'SCHOOL O'), (9443, 16, '16 SCHOO'), (9485, 17, 'SCHOOL O'), (9522, 18, '18 SCHOO'),
        (9582, 19, 'SCHOOL O'),
    ],
    'FIELDART-1863': [
        (1939, 8, 'ORGANIZATION'), (1975, 9, 'OaOANIZATION'), (2250, 10, '10'), (2354, 11, 'FIXLB'), (2445, 12, '12'), (2525, 13, 'KATT'),
        (2598, 14, '14'), (2644, 15, 'ORGANIZATION'), (2938, 16, 'ORGANIZATION'), (2990, 17, '17'), (3035, 18, 'OROAXIZATIO'), (3075, 19, 'BATTERIES'),
        (3258, 20, '20'), (3580, 21, 'BATTERIES'),
        (17758, 248, '248'), (17805, 249, 'SECTION'), (17850, 250, '250'), (17894, 251, '251'), (6347, 42, '42'), (6390, 43, 'RAXaES'), (6541, 44, '44'), (6812, 45, '45'),
        (7710, 61, '61'), (7760, 62, 'FIELD SERVICE'), (7812, 63, '63'), (7858, 64, 'FIEI-D SERVICE'), (7900, 65, '65'),
        (10109, 107, 'JOY'), (10150, 108, '108'), (10195, 109, '109'), (10249, 110, '110'), (10297, 111, 'Ill'), (10346, 112, '112'), (10393, 113, 'PIKCX'),
        (10440, 114, 'SCHOOL OF THE PIECE'), (10488, 115, 'PLECZ'), (10539, 116, '116'), (10584, 117, 'MECE'), (10625, 118, '118'), (10675, 119, '119'),
        (10724, 120, '120'), (10770, 121, '121'), (10822, 122, '122'), (10868, 123, '123'), (10913, 124, '124'), (10966, 125, 'PIECE'), (11093, 126, '126'), (11113, 127, '127'),
    ],
    'ORDNANCE-1861': [
        (41573, 303, 'EQUIPMENT'), (41781, 304, '304'), (48089, 359, 'Thirteenth'), (48161, 360, 'XIII'), (48409, 361, 'RANGES'),
    ],
    'GIBBON-1860': [
        (33591, 29, 'APPENDIX'), (35910, 40, 'APPENDIX'), (36078, 41, '41'), (36241, 42, '42'), (36495, 43, 'APPENDIX'), (16381, 283, 'BOARMANX'),
        (3278, 57, 'FORM'), (15471, 266, 'PRACTICE'), (15634, 269, 'MORTAR'), (15684, 270, '270'), (22003, 385, '3S5'), (22044, 386, '38G'), (22101, 387, '3S7'), (22155, 388, '3SS'),
    ],
}


def raw(manual):
    if manual not in _cache:
        p = os.path.join(LIB, MANUALS[manual]['file'])
        with open(p, encoding='utf-8', errors='replace') as f:
            txt = f.read()
        lines = txt.split('\n')
        _cache[manual] = lines
    return _cache[manual]


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


_norm_cache = {}


def normtext(manual):
    """Normalised full text plus a map from normalised offset -> source line number."""
    if manual in _norm_cache:
        return _norm_cache[manual]
    lines = raw(manual)
    parts, starts, pos = [], [], 0
    for i, l in enumerate(lines):
        w = ' '.join(l.split())
        if not w:
            continue
        starts.append((pos, i + 1))
        parts.append(w)
        pos += len(w) + 1
    full = ' '.join(parts)
    _norm_cache[manual] = (full, [s[0] for s in starts], [s[1] for s in starts])
    return _norm_cache[manual]


def locate(manual, phrase):
    full, offs, lns = normtext(manual)
    p = norm(phrase)
    out, i = [], full.find(p)
    while i != -1:
        k = bisect.bisect_right(offs, i) - 1
        out.append((lns[k], i))
        i = full.find(p, i + 1)
    return out


# ---------------------------------------------------------------- page headers
_DIGITISH = set('0123456789')
_GARBLE = {'l': '1', 'I': '1', '|': '1', '!': '1', 'O': '0', 'o': '0', 'U': '0', 'S': '5', 'B': '8', 'T': '7', 'Z': '2', 'G': '6', 'g': '9', 'i': '1', 'H': '11'}


def parse_num(tok):
    """Return int or None.  Only clean digits count as a parsed number."""
    t = tok.strip('.:,;')
    if re.fullmatch(r'\d{1,3}', t):
        return int(t)
    return None


def _upper_ratio(t):
    letters = [c for c in t if c.isalpha()]
    if len(letters) < 5:
        return 0.0
    return sum(c.isupper() for c in letters) / len(letters)


_NUMTOK = r'([0-9A-Za-z|!\'\^.:]{1,5})'
_TITLE = r'([A-Za-z][A-Za-z0-9 .,;:\-—\'*&]{5,70}?)'
_STOP = {'to', 'in', 'of', 'the', 'and', 'by', 'at', 'on', 'for', 'or', 'no', 'an', 'as', 'it', 'is', 'be'}


def _digitish_ok(tok):
    t = tok.strip('.:,;')
    if not t or t.lower() in _STOP:
        return False
    if re.search(r'\d', t):
        return True
    # all-garble tokens such as Ill, ll6 handled above (contain digit); pure letters of digit-like shape
    return len(t) >= 2 and all(c in 'lIO|!UTSBZ' for c in t)


def find_headers(manual):
    """List of (line_no, parsed_number_or_None, header_text) in file order."""
    key = ('hdr', manual)
    if key in _cache:
        return _cache[key]
    lines = raw(manual)
    head = MANUALS[manual]['head']
    hre = re.compile(head, re.I) if head else None
    hs = []
    n = len(lines)
    for i, l in enumerate(lines):
        s = ' '.join(l.split())
        if not s or len(s) > 90:
            continue
        m1 = re.fullmatch(_NUMTOK + r'\s+' + _TITLE + r'\.?\s*', s)   # "44 SCHOOL OF THE SOLDIER"
        m2 = re.fullmatch(_TITLE.replace('([A-Za-z]', '([A-Za-z0-9]', 1) + r'\.?\s+' + _NUMTOK, s)             # "SCHOOL OF THE SOLDIER 45"
        cand = None
        if m1 and _digitish_ok(m1.group(1)):
            cand = (m1.group(1), m1.group(2))
        elif m2 and _digitish_ok(m2.group(2)):
            cand = (m2.group(2), m2.group(1))
        if cand and ((re.fullmatch(r'\d\.', cand[0]) or re.search(r'NO\.?$', cand[1].strip(), re.I)) or re.search(r'NOS?\.\s*$', cand[1])):
            cand = None          # numbered sub-heads ("2. FORWARD.", "...DUTIES OF NO. 1.") are not page heads
        if cand:
            tok, title = cand
            if re.search(r'Pl\.?\s*\d*\.?\s*$|Fh\.|PL', title + ' ' + tok, re.I) and hre is not None:
                continue        # plate captions carry plate numbers, not page numbers
            if hre is not None:
                if not hre.search(title):
                    continue
                if _upper_ratio(title) < MANUALS[manual].get('minupper', 0.6) and not re.search(r'(part|paet|lesson|lesso)\s+[ivxlcdm]+', title, re.I):
                    continue
            elif _upper_ratio(title) < 0.8:
                continue
            hs.append((i + 1, parse_num(tok), s))
            continue
        # head line followed by a bare number line (Gibbon style: "AMMUNITION." <blank> "259")
        if hre is None and _upper_ratio(s) >= 0.8 and len(s) <= 60 and not re.search(r'\d', s):
            for j in range(i + 1, min(n, i + 6)):
                t = lines[j].strip()
                if not t or t.lower().startswith('digitized'):
                    continue
                if re.fullmatch(r'\d{1,3}', t):
                    hs.append((i + 1, int(t), s + ' | ' + t))
                break
        # bare number line followed by a capitalised head line (Gibbon / Ordnance style: "394" <blank> "FIELD ARTILLERY.")
        if hre is None and re.fullmatch(r'\d{1,3}', s):
            for j in range(i + 1, min(n, i + 7)):
                t = ' '.join(lines[j].split())
                if not t or t.lower().startswith('digitized'):
                    continue
                if _upper_ratio(t) >= 0.8 and len(t) <= 60 and not re.search(r'\d', t):
                    hs.append((i + 1, int(s), s + ' | ' + t))
                break
    hs.sort(key=lambda h: h[0])
    ded = []
    for h in hs:
        if ded and h[1] is not None and ded[-1][1] == h[1] and h[0] - ded[-1][0] <= 14:
            continue
        ded.append(h)
    hs = ded
    _cache[key] = hs
    return hs


def _chain(manual):
    """Local index-offset voting.  For every parsed head i, offset_i = number_i - i.  Heads of one stretch share one offset; a misread
    number is an outlier, a lost or spurious head shifts the offset by one.  For head k the page is  k + (distance-weighted modal offset
    of the parsed heads near k).  Returns (heads, info) with info[k] = (page, confidence)."""
    key = ('chain', manual)
    if key in _cache:
        return _cache[key]
    hs = find_headers(manual)
    n = len(hs)
    par = [(i, h[1] - i) for i, h in enumerate(hs) if h[1] is not None]
    info = {}
    for k in range(n):
        w = {}
        for i, off in par:
            d = abs(i - k)
            if d > 5:
                continue
            w[off] = w.get(off, 0.0) + (0.7 if d == 0 else 1.0 / (1 + d))
        if not w:
            continue
        ranked = sorted(w.items(), key=lambda t: -t[1])
        off, wt = ranked[0]
        second = ranked[1][1] if len(ranked) > 1 else 0.0
        page = k + off
        v = hs[k][1]
        if wt < 0.7 or second > 0.8 * wt:
            conf = 'low'
        elif v is not None and v == page:
            sup = sum(1 for i, o in par if i != k and abs(i - k) <= 2 and o == off)
            conf = 'high' if sup >= 1 else 'medium'
        elif v is not None:
            conf = 'medium'          # head reads a different number: treated as an OCR misread of this page's number
        else:
            conf = 'inferred'
        info[k] = (page, conf, v)
    _cache[key] = (hs, info)
    return _cache[key]


_LOOSE = {'l': '1', 'I': '1', '|': '1', '!': '1', 'i': '1', 'O': '0', 'o': '0', 'U': '0', 'S': '5', 'B': '8', 'T': '7', 'G': '6', 'Z': '2'}


def loose_num(text):
    """Best-effort reading of a garbled page-number token at either end of a running head (used only to corroborate)."""
    if not text:
        return None
    toks = text.split()
    for tok in (toks[-1], toks[0]):
        t = tok.strip('.:,;^')
        if 1 <= len(t) <= 4 and all(c in _LOOSE or c.isdigit() for c in t):
            r = ''.join(_LOOSE.get(c, c) for c in t)
            if r.isdigit():
                return int(r)
    return None


def page_of(manual, line_no):
    """Printed page for a passage at OCR line `line_no`: (page|None, confidence, header_line, header_text).
    confidence: high = head number parsed and equals the sequence-voted page; medium = head number differs (misread) or weakly supported;
    inferred = head number unreadable, page from the sequence; low = unstable sequence or a possibly missing head between head and passage."""
    ex = sorted(EXTRA_HEADS.get(manual, []))
    exl = [e[0] for e in ex]
    ke = bisect.bisect_right(exl, line_no) - 1
    hs, info = _chain(manual)
    lns = [h[0] for h in hs]
    k = bisect.bisect_right(lns, line_no) - 1
    if ke >= 0 and (k < 0 or exl[ke] >= lns[k] - 2):
        el, ep, sub = ex[ke]
        txt = ' '.join(raw(manual)[el - 1].split())
        near = ' '.join(' '.join(l.split()) for l in raw(manual)[el - 1:el + 5])
        return (ep, 'high' if re.search(r'(?<!\d)%d(?!\d)' % ep, near) else 'medium', el, txt)
    if k < 0 or k not in info:
        return (None, 'none', lns[k] if k >= 0 else None, hs[k][2] if k >= 0 else None)
    page, conf, v = info[k]
    ln, _, txt = hs[k]
    # a gap much larger than the local page length means a running head may have been lost between head k and the passage
    allh = sorted(set(lns) | set(exl))
    ka = bisect.bisect_right(allh, line_no) - 1
    gaps = [allh[j + 1] - allh[j] for j in range(max(0, ka - 3), min(len(allh) - 1, ka + 3))]
    med = sorted(gaps)[len(gaps) // 2] if gaps else None
    nxt = allh[ka + 1] if ka + 1 < len(allh) else None
    ln0 = allh[ka] if ka >= 0 else ln
    if med and nxt is not None and (line_no - ln0) > 1.45 * med:
        conf = 'low'
    if conf == 'inferred':
        lo = loose_num(txt)
        if lo is not None and lo == page:
            conf = 'medium'
    return (page, conf, ln, txt)


if __name__ == '__main__':
    import sys
    for m in MANUALS:
        hs, info = _chain(m)
        c = {}
        for i in range(len(hs)):
            c[info.get(i, (0, 'none'))[1]] = c.get(info.get(i, (0, 'none'))[1], 0) + 1
        print(m, len(raw(m)), 'lines;', len(hs), 'headers;', c)
