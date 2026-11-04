"""Segment the public-domain state regimental volumes (and Fox, Battles and Leaders vol. 3) into regiment / article sections and
write docs/battle-theatre/library/statevol_index.json.

Usage:  python -I tools/bt/statevol_index.py             (build everything)
        python -I tools/bt/statevol_index.py --spot 20   (print 20 random offsets with the page the model assigns, for the eyeball check)
        python -I tools/bt/statevol_index.py --list NY2  (list the sections of one volume)

Every section carries CHARACTER offsets into the ORIGINAL raw file (UTF-8 decoded, newline untouched). Nothing here edits the text.
Printed page numbers are recovered from the running heads ("New York at Gettysburg. 1105", "130 Pennsylvania at Gettysburg.",
Michigan "(129)", Maine "TWENTIETH REGIMENT ENGAGED. 253"); anchors that break the monotonic page order are dropped as OCR errors
and the text between two anchors more than one page apart carries a page RANGE with interpolated: true.
OCR quality per section is a mechanical grade (share of tokens that are plain words), not a reading.
"""
import os, re, sys, json, random, bisect, hashlib, datetime, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RAW_DIR = os.path.join(ROOT, 'tmp', 'library', 'misc')
LIB_DIR = os.path.join(ROOT, 'docs', 'battle-theatre', 'library')
INDEX_PATH = os.path.join(LIB_DIR, 'statevol_index.json')

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# volume key -> description. 'cite' is the short citation prefix used by statevol_find.py and the claim ledger.
VOLUMES = {
    'PA1': dict(file='pennsylvaniaatge02lcpenn', source_id='PA-GB-1904', cite='Pennsylvania at Gettysburg (1904) vol. 1', state='PA',
                heads='pa', pages='pa'),
    'PA1B': dict(file='pennsylvaniaatge04penn', source_id='PA-GB-1914a', cite='Pennsylvania at Gettysburg (1914) vol. 1', state='PA',
                 heads='pa', pages='pa'),
    'PA2': dict(file='pennsgettysburg02reynrich', source_id='PA-GB-1914-v2', cite='Pennsylvania at Gettysburg (1914) vol. 2', state='PA',
                heads='pa', pages='pa'),
    'NY1': dict(file='newyorkatgettysb0001unse', source_id='NY-GB-1900', cite='New York at Gettysburg (1900) vol. 1', state='NY',
                heads='ny', pages='ny'),
    'NY2': dict(file='finalreportonba00chatgoog', source_id='NY-GB-1900-v2', cite='New York at Gettysburg (1900) vol. 2', state='NY',
                heads='ny', pages='ny_google'),
    'NY3': dict(file='cu31924052145475', source_id='NY-GB-1902-v3', cite='New York at Gettysburg (1902) vol. 3', state='NY',
                heads='ny', pages='ny'),
    'ME': dict(file='maineatgettysbu01commgoog', source_id='ME-GB-1898', cite='Maine at Gettysburg (1898)', state='ME',
               heads='me', pages='me'),
    'MI': dict(file='cu31924030924736', source_id='MI-GB-1889', cite='Michigan at Gettysburg (1889)', state='MI',
               heads='mi', pages=['mi', 'me']),
    'FOX': dict(file='reglossescivilwar00foxwrich', source_id='FOX-1889', cite="Fox, Regimental Losses (1889)", state=None,
                heads='fox', pages=['generic']),
    'BL3': dict(file='battlesleadersof03cent', source_id='BL-3', cite='Battles and Leaders vol. 3', state=None,
                heads='bl', pages=['generic']),
}

ORD_WORDS = {
    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
    'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14, 'fifteenth': 15, 'sixteenth': 16, 'seventeenth': 17,
    'eighteenth': 18, 'nineteenth': 19, 'twentieth': 20, 'thirtieth': 30, 'fortieth': 40, 'fiftieth': 50, 'sixtieth': 60,
    'seventieth': 70, 'eightieth': 80, 'ninetieth': 90,
}
TENS = {'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}


def ord_word_to_int(s):
    """'one hundred and nineteenth' -> 119; 'twenty-sixth' -> 26; 'sixteenth' -> 16. None when not parsable."""
    s = s.lower().replace('-', ' ').replace('  ', ' ').strip()
    n = 0
    if s.startswith('one hundred'):
        n = 100
        s = s[len('one hundred'):].strip()
        if s.startswith('and'):
            s = s[3:].strip()
        if not s:
            return 100
    parts = s.split()
    if len(parts) == 1:
        if parts[0] in ORD_WORDS:
            return n + ORD_WORDS[parts[0]]
        return None
    if len(parts) == 2 and parts[0] in TENS and parts[1] in ORD_WORDS and ORD_WORDS[parts[1]] < 10:
        return n + TENS[parts[0]] + ORD_WORDS[parts[1]]
    return None


def ocr_int(s):
    """Digits with the usual OCR substitutions (I,l,|->1; O,o->0; S->5 only when alone is ambiguous: not applied)."""
    s2 = re.sub(r'[Il|]', '1', s).replace('O', '0').replace('o', '0').replace(' ', '')
    m = re.match(r'^(\d{1,4})', s2)
    return int(m.group(1)) if m else None


def load(key):
    p = os.path.join(RAW_DIR, VOLUMES[key]['file'] + '_djvu.txt')
    with open(p, encoding='utf-8', errors='replace', newline='') as f:
        return f.read()


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def lines_with_offsets(text):
    pos = 0
    for ln in text.split('\n'):
        yield pos, ln
        pos += len(ln) + 1


# ------------------------------------------------------------------ page anchors
RH = {
    'pa': re.compile(r"^\s*(?:([\dIlO]{1,4})\s+[PJ]['\w]{0,4}sylvania\s+at\s+[GO]\w{4,12}|[PJ]['\w]{0,4}sylvania\s+at\s+[GO]\w{4,12}[.,;:']?\s+([\dIlO]{1,4}))\W*$", re.I),
    'ny': re.compile(r"^\s*(?:([\dIlOo]{1,4})\s+New\s+Yor\w*\s+a\w\s+G\w{4,12}|New\s+Yor\w*\s+a\w\s+G\w{4,12}[.,;:']?\s+([\dIlOo]{1,4}))\W*$", re.I),
    'me': re.compile(r"^\s*(?:(\d{1,4})\s+[A-Z][A-Z .,'\-]{6,70}|[A-Z][A-Z .,'\-]{6,70}\.?\s+(\d{1,4}))\s*\.?\s*$"),
    'mi': re.compile(r"^\s*\((\d{1,3})\)\s*$"),
}


def page_anchors(text, style):
    """Return sorted list of (offset, page) anchors from the running heads. style: a name or a list of names."""
    if isinstance(style, (list, tuple)):
        out = []
        for st in style:
            out.extend(page_anchors_raw(text, st))
        out.sort()
        return monotonic(out)
    return monotonic(page_anchors_raw(text, style))


def page_anchors_raw(text, style):
    out = []
    lines = list(lines_with_offsets(text))
    if style in ('pa', 'ny', 'me', 'mi'):
        rx = RH[style]
        for off, ln in lines:
            m = rx.match(ln)
            if not m:
                continue
            g = [x for x in m.groups() if x]
            if not g:
                continue
            n = ocr_int(g[0])
            if n:
                out.append((off, n))
    elif style == 'ny_google':
        # Google OCR: 'New York at Gettysburg.' running head with the number on the same line ('8o6 New York at Gettysburg.')
        # or on the nearest non-empty line before/after.
        rx = re.compile(r"(?i)^\s*(?:([\dIlOo]{1,4})\s+)?New\s+Yor\w*\s+at\s+Gett\w+[.,;:]?\s*(?:([\dIlOo]{1,4}))?\s*\.?\s*$")
        nonempty = [(i, off, ln) for i, (off, ln) in enumerate(lines) if ln.strip()]
        for j, (i, off, ln) in enumerate(nonempty):
            m = rx.match(ln)
            if not m:
                continue
            num = m.group(1) or m.group(2)
            if not num:
                for k in (j - 1, j + 1):
                    if 0 <= k < len(nonempty) and re.fullmatch(r'\s*[\dIlOo]{1,4}\s*', nonempty[k][2]):
                        num = nonempty[k][2].strip()
                        break
            if num:
                n = ocr_int(num)
                if n:
                    out.append((off, n))
    elif style == 'generic':
        # number-only lines whose nearest non-empty neighbour (within 3 lines) is an all-caps running head, and caps lines
        # that carry the number themselves ('THE FIRST DAY AT GETTYSBURG. 261', '24 REGIMENTAL LOSSES IN THE CIVIL WAR.')
        caps = re.compile(r"^[A-Z][A-Z .,'\-:;]{8,}$")
        n = len(lines)
        for idx, (off, ln) in enumerate(lines):
            s_ = ln.strip()
            if re.fullmatch(r'\d{1,4}', s_):
                nb = []
                for k in range(idx - 1, max(-1, idx - 4), -1):
                    if lines[k][1].strip():
                        nb.append(lines[k][1].strip()); break
                for k in range(idx + 1, min(n, idx + 4)):
                    if lines[k][1].strip():
                        nb.append(lines[k][1].strip()); break
                if any(caps.match(x) or re.match(r"^[A-Z][A-Z .,'\-:;]{8,}\s+\d{1,4}$", x) or re.match(r"^\d{1,4}\s+[A-Z][A-Z .,'\-:;]{8,}$", x) for x in nb):
                    out.append((off, int(s_)))
            else:
                m = re.match(r"^\s*(\d{1,4})\s+[A-Z][A-Z .,'\-:;]{8,}\.?\s*$", ln) or re.match(r"^\s*[A-Z][A-Z .,'\-:;]{8,}\.?\s+(\d{1,4})\s*$", ln)
                if m and not re.search(r'\.{3,}|  \d', ln):
                    out.append((off, int(m.group(1))))
    out.sort()
    return out


def monotonic(anchors):
    """Longest strictly increasing (by page) chain of anchors in offset order: OCR-garbled page numbers fall out as spikes.
    A final sanity pass drops any kept anchor that jumps more than 60 pages from its predecessor (a garbled number at the end of a run)."""
    if not anchors:
        return []
    import bisect as _b
    pages = [p for _, p in anchors]
    tails, tails_idx, prev = [], [], [-1] * len(pages)
    for i, p in enumerate(pages):
        j = _b.bisect_left(tails, p)
        if j == len(tails):
            tails.append(p); tails_idx.append(i)
        else:
            tails[j] = p; tails_idx[j] = i
        prev[i] = tails_idx[j - 1] if j > 0 else -1
    chain = []
    k = tails_idx[-1]
    while k != -1:
        chain.append(anchors[k]); k = prev[k]
    chain.reverse()
    out = []
    for off, p in chain:
        if out and p - out[-1][1] > 60:
            continue
        out.append((off, p))
    return out


class PageModel:
    def __init__(self, anchors):
        self.anchors = anchors
        self.offs = [a for a, _ in anchors]

    def page_at(self, off):
        """(page_label, interpolated). Running heads sit at the top of their page, so the text after an anchor is on that page
        until the next anchor. When the next anchor is more than one page ahead, the label is a range."""
        i = bisect.bisect_right(self.offs, off) - 1
        if i < 0:
            if not self.anchors:
                return None, True
            p = self.anchors[0][1]
            return ('<%d' % p), True
        p = self.anchors[i][1]
        if i + 1 < len(self.anchors):
            q = self.anchors[i + 1][1]
            if q - p > 1:
                return ('%d~%d' % (p, q - 1)), True
        return str(p), False


# ------------------------------------------------------------------ section headings
ARM_WORDS = r'(?:INFANTRY|INFANTRV|INFANTKY|INF\'?Y|INF|CAVALRY|CAV|VOLUNTEERS|INDEPENDENT\s+BATTERY|INDEPENDENT|LIGHT\s+ARTILLERY|LIGHT\s+BATTERY|BATTERY|REGT|ARTILLERY|ENGINEERS|SHARPSHOOTERS)'
RX_NY_HEAD = re.compile(r'^[ \t]*(?P<num>(?:\d{1,3}|[Il]\d{1,2}|\d[Il]\d?|i\d{2}|ii\d))\s?(?:ST|ND|RD|TH|D|TII|TH\.)\s+(?P<body>(?:N\.\s?Y\.|NEW\s+YORK|REGIMENT)\s+' + ARM_WORDS + r'[^\n]{0,30})$', re.I)
RX_NY_BATTERY = re.compile(r"^[ \t]*(?P<body>(?:BATTERY\s+[A-M],?\s+(?:1ST|FIRST)\s+(?:N\.\s?Y\.|NEW\s+YORK)\s+(?:LIGHT\s+)?ARTILLERY|(?:1ST|FIRST)\s+(?:N\.\s?Y\.|NEW\s+YORK)\s+(?:LIGHT\s+)?ARTILLERY,?\s+BATTERY\s+[A-M]|[A-Z']+\s+(?:N\.\s?Y\.|NEW\s+YORK)\s+(?:INDEPENDENT\s+)?BATTERY)[^\n]{0,30})$", re.I)
RX_PA_HEAD = re.compile(r'DEDICATION\s+OF\s+MONUMENT[^\n]*\n(?:[ \t]*\n)*[ \t]*(?P<line>[^\n]{3,80})\n')
RX_ME_HEAD = re.compile(r"^[ \t]*(?P<line>(?:[A-Z\-]+\s+)?(?:ONE\s+HUNDRED\s+(?:AND\s+)?)?[A-Z\-]+\s+(?:MAINE\s+)?(?:REGIMENT|BATTERY|CAVALRY)[A-Z ,.'\-]{0,40})\.?\s*$")
RX_MI_HEAD = re.compile(r"^[ \t]*(?P<line>(?:[A-Z\-]+\s+)?(?:INFANTRY|CAVALRY\s+BRIGADE|BATTERY|CAVALRY|SHARPSHOOTERS)\.?)\s*$")
RX_FOX_HEAD = re.compile(r"^[ \t]*(?P<line>(?:ONE\s+HUNDRED\s+(?:AND\s+)?)?[A-Z\-]+\s+(?:[A-Z\-]+\s+)?(?:[A-Z]+\s+)?(?:INFANTRY|CAVALRY|ARTILLERY|HEAVY\s+ARTILLERY|LIGHT\s+ARTILLERY|SHARPSHOOTERS|ZOUAVES|RESERVES)\.?)\s*$")


def sections_pa(text, key):
    secs = []
    for m in RX_PA_HEAD.finditer(text):
        line = ' '.join(m.group('line').split())
        if not re.search(r'(?i)REG|INF|CAV|BATTERY|ARTILLERY|EMERGENCY', line):
            continue
        num = None
        arm = 'infantry' if re.search(r'(?i)INF', line) else 'cavalry' if re.search(r'(?i)CAV', line) else 'artillery' if re.search(r'(?i)BATTERY|ART', line) else None
        mm = re.match(r'^[^\dIlO]*?([\dIlO](?:[\dIlO]| (?=[\dIlO])){0,3})(?![\dIlO])', line)
        if mm and arm != 'artillery':
            num = ocr_int(mm.group(1))
        secs.append({'start': m.start(), 'heading_offset': m.start(), 'title_ocr': line, 'number': num, 'arm': arm, 'unit_label': None})
    return secs


def sections_ny(text, key):
    secs = []
    for off, ln in lines_with_offsets(text):
        if len(ln) > 90:
            continue
        if re.search(r'\s\d{2,4}\s*$', ln) or re.search(r'\.{3,}', ln):
            continue
        m = RX_NY_HEAD.match(ln)
        if m:
            num = ocr_int(m.group('num').replace('i', '1'))
            body = m.group('body')
            arm = 'cavalry' if re.search(r'(?i)CAV', body) else 'artillery' if re.search(r'(?i)BATTERY|ARTILLERY', body) else 'infantry'
            secs.append({'start': off, 'heading_offset': off, 'title_ocr': ' '.join(ln.split()), 'number': num, 'arm': arm, 'unit_label': None})
            continue
        m = RX_NY_BATTERY.match(ln)
        if m:
            secs.append({'start': off, 'heading_offset': off, 'title_ocr': ' '.join(ln.split()), 'number': None, 'arm': 'artillery', 'unit_label': None})
    return secs


def sections_words(text, key, rx, arm_default='infantry'):
    secs = []
    for off, ln in lines_with_offsets(text):
        if len(ln) > 90 or not ln.strip():
            continue
        m = rx.match(ln)
        if not m:
            continue
        line = ' '.join(m.group('line').split())
        if key == 'FOX' and not re.search(r'MAINE|HAMPSHIRE|VERMONT|MASSACHUSETTS|RHODE|CONNECTICUT|NEW YORK|JERSEY|PENNSYLVANIA|DELAWARE|MARYLAND|OHIO|INDIANA|ILLINOIS|MICHIGAN|WISCONSIN|MINNESOTA|IOWA|KANSAS|KENTUCKY|MISSOURI|TENNESSEE|VIRGINIA|U\. ?S\.|UNITED STATES|COLORED|SHARPSHOOTERS|RESERVES', line):
            continue
        words = re.match(r'^((?:ONE\s+HUNDRED\s+(?:AND\s+)?)?[A-Z\-]+)', line)
        num = ord_word_to_int(words.group(1)) if words else None
        arm = 'cavalry' if 'CAVALRY' in line else 'artillery' if ('BATTERY' in line or 'ARTILLERY' in line) else arm_default
        secs.append({'start': off, 'heading_offset': off, 'title_ocr': line, 'number': num, 'arm': arm, 'unit_label': None})
    return secs


def sections_bl(text, key):
    """Battles and Leaders: an article begins where a caps title line is followed within 400 chars by a 'BY <AUTHOR>' line."""
    secs = []
    for m in re.finditer(r"\n[ \t]*([A-Z][A-Z0-9 ,.'\-:;!?]{8,90})\.?[ \t]*\n(?:[^\n]*\n){0,6}?[ \t]*BY\s+([A-Z][A-Za-z .,'\-]{3,80})", text):
        title = ' '.join(m.group(1).split())
        if title.startswith('BY '):
            continue
        secs.append({'start': m.start() + 1, 'heading_offset': m.start() + 1, 'title_ocr': title, 'number': None, 'arm': None, 'unit_label': None,
                     'author_ocr': ' '.join(m.group(2).split())})
    return secs


def grade_ocr(seg):
    toks = re.findall(r'\S+', seg)
    if not toks:
        return 'empty', 0.0
    good = sum(1 for t in toks if re.fullmatch(r"[A-Za-z][a-z]*[.,;:!?'\")]*|\d{1,4}[.,;:]?|[A-Z][A-Z]+[.,;:]?|[\(\"'][A-Za-z]+[.,;:!?'\")]*", t))
    r = good / len(toks)
    return ('good' if r >= 0.9 else 'fair' if r >= 0.8 else 'poor'), round(r, 3)


def merge_adjacent(secs, text, max_gap=2500):
    """Headings of the same regiment that follow one another closely (inscription caption then dedication heading) form one section."""
    out = []
    for s in secs:
        if out and s['number'] is not None and out[-1]['number'] == s['number'] and out[-1]['arm'] == s['arm'] and s['start'] - out[-1]['start'] <= max_gap:
            out[-1]['title_ocr'] += ' | ' + s['title_ocr']
            continue
        out.append(s)
    return out


def build_volume(key, spot=False):
    v = VOLUMES[key]
    text = load(key)
    anchors = page_anchors(text, v['pages'])
    pm = PageModel(anchors)
    if v['heads'] == 'pa':
        secs = sections_pa(text, key)
    elif v['heads'] == 'ny':
        secs = merge_adjacent(sections_ny(text, key), text, max_gap=4000)
    elif v['heads'] == 'me':
        secs = merge_adjacent(sections_words(text, key, RX_ME_HEAD), text, max_gap=200)
    elif v['heads'] == 'mi':
        secs = sections_words(text, key, RX_MI_HEAD)
    elif v['heads'] == 'fox':
        secs = sections_words(text, key, RX_FOX_HEAD)
    else:
        secs = sections_bl(text, key)
    secs.sort(key=lambda s: s['start'])
    if not secs or secs[0]['start'] > 0:
        secs.insert(0, {'start': 0, 'heading_offset': 0, 'title_ocr': 'front matter (title, commission narrative, lists)', 'number': None, 'arm': None, 'unit_label': None})
    for i, s in enumerate(secs):
        s['end'] = secs[i + 1]['start'] if i + 1 < len(secs) else len(text)
        s['id'] = '%s-S%03d' % (key, i + 1)
        s['volume'] = key
        p0, i0 = pm.page_at(s['start'])
        p1, i1 = pm.page_at(max(s['start'], s['end'] - 1))
        s['printed_pages'] = p0 if p0 == p1 else '%s to %s' % (p0, p1)
        s['pages_interpolated'] = bool(i0 or i1)
        s['chars'] = s['end'] - s['start']
        s['ocr_grade'], s['ocr_word_share'] = grade_ocr(text[s['start']:s['end']])
        s['kind'] = 'toc_entry' if re.search(r'\s\d{2,4}\s*$', s['title_ocr']) else 'inscription_caption' if s['chars'] < 1500 else 'section'
        # speakers / authors printed inside the section (state volumes print 'ADDRESS OF ...', 'ORATION OF ...')
        auth = re.findall(r"(?i)\n[ \t]*(?:ADDRESS|ORATION|REMARKS|HISTORICAL\s+SKETCH|POEM|HISTORY|SKETCH)\s+(?:OF|BY|READ\s+BY|DELIVERED\s+BY)\s+([^\n]{3,80})\n", text[s['start']:s['end']])
        s['authors_printed'] = [' '.join(a.split()) for a in auth][:12]
    rec = {'key': key, 'file': v['file'] + '_djvu.txt', 'source_id': v['source_id'], 'cite': v['cite'], 'state': v['state'],
           'chars': len(text), 'sha256': sha256_file(os.path.join(RAW_DIR, v['file'] + '_djvu.txt')), 'page_anchors': len(anchors),
           'page_range': [anchors[0][1], anchors[-1][1]] if anchors else None, 'sections': len(secs), 'anchors': anchors}
    return rec, secs, text, pm


def main():
    args = sys.argv[1:]
    if args and args[0] == '--list':
        rec, secs, text, pm = build_volume(args[1])
        for s in secs:
            print(s['id'], s['start'], s['printed_pages'], s['number'], s['arm'], s['ocr_grade'], s['kind'], '|', s['title_ocr'][:70], '|', s['authors_printed'][:2])
        return
    if args and args[0] == '--spot':
        n = int(args[1]) if len(args) > 1 else 20
        random.seed(11)
        for key in VOLUMES:
            rec, secs, text, pm = build_volume(key)
            for off in sorted(random.sample(range(len(text)), max(1, n // len(VOLUMES)))):
                p, interp = pm.page_at(off)
                print(key, off, 'page', p, 'interp' if interp else '', '|', ' '.join(text[max(0, off - 90):off + 90].split()))
        return
    vols, allsecs = [], []
    for key in VOLUMES:
        rec, secs, text, pm = build_volume(key)
        vols.append(rec)
        allsecs.extend(secs)
        print(key, rec['chars'], 'anchors', rec['page_anchors'], rec['page_range'], 'sections', len(secs),
              dict(collections.Counter(s['ocr_grade'] for s in secs)))
    out = {'_doc': 'Index of the state regimental volumes (and Fox, Battles and Leaders 3). Offsets are character offsets into the raw djvu text under tmp/library/misc/. '
                   'Pages come from running heads; a label with ~ is a range inside a run of pages whose heads the OCR lost. Built by tools/bt/statevol_index.py.',
           'built': datetime.date.today().isoformat(), 'volumes': vols, 'sections': allsecs}
    os.makedirs(LIB_DIR, exist_ok=True)
    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    print('wrote', INDEX_PATH, len(allsecs), 'sections')


if __name__ == '__main__':
    main()
