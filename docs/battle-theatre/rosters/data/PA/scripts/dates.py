"""Date and event parsing for Bates remarks (OCR tolerant). Standard library only."""
import re, datetime, difflib

GB_START = datetime.date(1863, 7, 1)
GB_END = datetime.date(1863, 7, 3)
MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
M3 = {m[:3]: i + 1 for i, m in enumerate(MONTHS)}
M3.update({'mav': 5, 'tun': 6, 'jun': 6, 'jul': 7, 'jnl': 7, 'sep': 9, 'sept': 9})


def month_of(tok):
    t = re.sub(r'[^A-Za-z]', '', tok).lower()
    if len(t) < 3:
        return None
    if len(t) in (3, 4) and t[:3] not in M3 and t not in ('tune', 'juno'):
        sc = sorted(((difflib.SequenceMatcher(None, t, k).ratio(), v) for k, v in M3.items() if len(k) == 3), reverse=True)
        if sc and sc[0][0] >= 0.66 and (len(sc) < 2 or sc[1][0] < sc[0][0] - 0.05) and t[1:3] == [k for k, v in M3.items() if v == sc[0][1] and len(k) == 3][0][1:3]:
            return sc[0][1]
    if t[:3] in M3 and (len(t) <= 4 or difflib.SequenceMatcher(None, t, MONTHS[M3[t[:3]] - 1]).ratio() >= 0.6):
        return M3[t[:3]]
    if t in ('tune', 'juno', 'jnne', 'jime', 'jiine', 'tulv', 'julv', 'jnly', 'jiily', 'jaly', 'octoher', 'septemher', 'decern', 'novemljer', 'novemher', 'sepiembeir'):
        return {'tune': 6, 'juno': 6, 'jnne': 6, 'jime': 6, 'jiine': 6, 'tulv': 7, 'julv': 7, 'jnly': 7, 'jiily': 7, 'jaly': 7, 'octoher': 10, 'septemher': 9, 'decern': 12, 'novemljer': 11, 'novemher': 11, 'sepiembeir': 9}[t]
    if len(t) >= 5:
        best = max(range(12), key=lambda i: difflib.SequenceMatcher(None, t, MONTHS[i]).ratio())
        if difflib.SequenceMatcher(None, t, MONTHS[best]).ratio() >= 0.78:
            return best + 1
    return None


YMAP = str.maketrans({'O': '0', 'o': '0', 'l': '1', 'I': '1', 'i': '1', 'S': '8', 's': '8', 'B': '8', 'G': '6', 'g': '9', 'b': '6', 'Z': '2', 'z': '2', 'T': '1'})


def year_of(tok):
    """'63 / 1863 / 1S63 / lB63 / '6.3 -> 1861..1866 or None"""
    q = re.match(r"^['‘’`\"^]?(?:18)?([56][0-9])(?![0-9])", tok.strip())
    if q and 1861 <= 1800 + int(q.group(1)) <= 1866:
        return 1800 + int(q.group(1))
    t = tok.strip()
    t = re.sub(r"[\s]", '', t)
    t = re.sub(r"^[\"'‘’`“”^]+", '', t)
    t = re.sub(r"^[^0-9A-Za-z]+", '', t)
    t = re.sub(r"[^0-9A-Za-z]+$", '', t)
    t = t.replace('.', '').replace(',', '')
    u = t.translate(YMAP)
    # position-wise repair of 4-character years: 1 8 6 d  (third place: S G b & 0 read for 6; fourth: o read for 5)
    if len(t) == 4:
        p1 = {'1': '1', 'l': '1', 'I': '1', 'i': '1', '!': '1', '|': '1'}.get(t[0])
        p2 = {'8': '8', 'S': '8', 's': '8', 'B': '8', '3': '8', '&': '8'}.get(t[1])
        p3 = {'6': '6', 'G': '6', 'S': '6', 's': '6', 'b': '6', '&': '6', '0': '6', 'g': '6'}.get(t[2])
        p4 = {'o': '5', 'O': '5'}.get(t[3]) or (t[3] if t[3].isdigit() else {'S': '5', 's': '5', 'B': '3', 'l': '1', 'I': '1', 'G': '6'}.get(t[3]))
        if p1 and p2 and p3 and p4 and p4.isdigit():
            u2 = p1 + p2 + p3 + p4
            if re.fullmatch(r'186[1-6]', u2):
                return int(u2)
    if re.fullmatch(r'13[56]\d', u):
        u = '18' + u[2:]
    if re.fullmatch(r'180[1-5]', u):
        u = '186' + u[3]
    if re.fullmatch(r'18[56]\d', u):
        y = int(u)
        return y if 1861 <= y <= 1866 else None
    if re.fullmatch(r'[56]\d', u):
        y = 1800 + int(u)
        return y if 1861 <= y <= 1866 else None
    return None


DAY_RE = re.compile(r'^[0-9OIlSo]{1,2}[,\.;:]*$')


def day_of(tok):
    t = re.sub(r'[,\.;:]+$', '', tok).translate(str.maketrans({'O': '0', 'o': '0', 'l': '1', 'I': '1', 'S': '5'}))
    if re.fullmatch(r'\d{1,2}', t):
        d = int(t)
        return d if 1 <= d <= 31 else None
    return None


def find_dates(text):
    """returns list of (date_or_None, precision, start_tok, end_tok, y, m, d). precision 'day'|'month'. Date uses day=1 for month precision."""
    text = re.sub(r"[—–]", " — ", text)
    text = re.sub(r"(?<=\s)\.(?=[0-9])", "", text)
    text = re.sub(r"([A-Za-z]{3,}\.)(?=[0-9A-Za-z])", r"\1 ", text)       # 'Dec.l3' -> 'Dec. l3'
    text = re.sub(r"([0-9OIlS]),(?=['‘’`\"]?[0-9GSBlI])", r"\1, ", text)   # '15,'64' -> '15, '64'
    toks = text.split()
    out = []
    i = 0
    while i < len(toks):
        m = month_of(toks[i]) if re.match(r"^[A-Za-z\.\\'’]{3,12}[\.,]?$", toks[i]) else None
        if m:
            d = day_of(toks[i + 1]) if i + 1 < len(toks) and DAY_RE.match(toks[i + 1]) else None
            if d is not None:
                # year in next one or two tokens (e.g. "1863" or "'63" or "18 63")
                y = None
                for j in (i + 2, i + 3):
                    if j < len(toks):
                        cand = toks[j] if j == i + 2 else toks[i + 2] + toks[j]
                        y = year_of(cand)
                        if y:
                            break
                if y:
                    mx = 28 if m == 2 else 30 if m in (4, 6, 9, 11) else 31
                    out.append((datetime.date(y, m, min(d, mx)), 'day', i, i + 2, y, m, d))
                    i += 3
                    continue
                out.append((None, 'day-no-year', i, i + 1, None, m, d))
                i += 2
                continue
            # month, year
            if i + 1 < len(toks):
                y = year_of(toks[i + 1])
                if y:
                    out.append((datetime.date(y, m, 1), 'month', i, i + 1, y, m, None))
                    i += 2
                    continue
        i += 1
    return out


KW = {'discharged': 'disch', 'disch': 'disch', 'died': 'died', 'killed': 'killed', 'deserted': 'desert', 'transferred': 'trans', 'tr': 'trans',
      'resigned': 'resign', 'res': 'resign', 'dismissed': 'dismiss', 'dropped': 'dismiss', 'cashiered': 'dismiss', 'wounded': 'wd', 'wd': 'wd',
      'captured': 'capt', 'missing': 'missing', 'mustered': 'mo', 'mus': 'mo', 'promoted': 'prom', 'pr': 'prom', 'absent': 'absent',
      'prisoner': 'capt', 'supposed': 'missing', 'drowned': 'died', 'drowhed': 'died'}


ADVERBS = ('dishonorably', 'honorably', 'accidentally', 'dishonorabiy', 'dishonorab')


def verb_of(seg):
    toks = seg.strip().split(' ') if seg.strip() else ['']
    # AUDIT R4: 'Dishonorably discharged', 'Honorably discharged', 'Accidentally killed/drowned' carry the verb in the second word
    if len(toks) > 1 and re.sub(r'[^a-z]', '', toks[0].lower()).startswith(ADVERBS[:4] + ('dishonor',)):
        toks = toks[1:]
    w = re.sub(r'[^A-Za-z]', '', toks[0])
    wl = w.lower()
    if not wl:
        return None
    if wl in KW:
        return KW[wl]
    best = None
    for k, v in KW.items():
        if len(k) < 4:
            continue
        r = difflib.SequenceMatcher(None, wl, k).ratio()
        if r >= 0.72 and (best is None or r > best[0]):
            best = (r, v)
    return best[1] if best else None


GETT = re.compile(r'(?<![A-Za-z])(?:[GC]ett?ys?b|Gettvsb|Gettysb|Gcttysb|Gettyshu|Get\w{0,3}sb\w*|Gettysl)', re.I)


def has_gettysburg(s):
    return bool(GETT.search(s)) or bool(re.search(r'gett[a-z]{1,4}burg', s, re.I))


def _norm_tok(t):
    return re.sub(r'[^a-z]', '', t.lower())


def gett_positions(text):
    """char offsets of tokens that read as 'Gettysburg' (OCR tolerant); Petersburg and other -burg names are excluded"""
    out = []
    for m in re.finditer(r"\S+", text):
        t = _norm_tok(m.group(0))
        if len(t) < 7 or len(t) > 14:
            continue
        if t[0] not in 'gcq' and not t.startswith('ge'):
            continue
        if difflib.SequenceMatcher(None, t, 'gettysburg').ratio() >= 0.74:
            out.append((m.start(), m.end()))
    # hyphen-split "Get- tysburg" is repaired upstream; also catch 'Gettys- burg' leftovers
    for m in re.finditer(r"Gett?y?s?-?\s?b[ua]r[gq]", text):
        if not any(a <= m.start() < b for a, b in out):
            out.append((m.start(), m.end()))
    return sorted(out)


KWSETS = {
    'wound': ['wounded', 'wounds', 'wound', 'wd', 'wds', 'mortally', 'wounding'],
    'kill': ['killed', 'slain'],
    'capt': ['captured', 'prisoner', 'capt', 'pris', 'missing'],
    'bur': ['buried', 'burial', 'interred', 'bu'],
}


def has_kw(window, kinds):
    words = [_norm_tok(w) for w in window.split()]
    for w in words:
        if not w:
            continue
        for k in kinds:
            for kw in KWSETS[k]:
                if w == kw:
                    return True
                if len(kw) >= 5 and len(w) >= 4 and difflib.SequenceMatcher(None, w, kw).ratio() >= 0.76:
                    return True
    return False
