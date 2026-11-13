"""Parser of the table pages of the Revised Roster of Vermont Volunteers (1892) from the word boxes of the item's djvu.xml.

A table page of this book has up to three tables.  Each table has a header block ("Name and Rank. / Residence. / Date of Enlistment /
Date of Muster. / Remarks."), is preceded by a title in large type ("COMPANY A.", "Field and Staff.", "Non-Commissioned Staff.", "BAND."),
and is made of lines that hold, from left to right, the name, the residence, the date of enlistment (commission), the date of muster
(issue) and the remarks.  The rank is not a cell: it is a heading line in the name column ("Sergeants.", "Privates.", "Captain.").
The OCR text of the Internet Archive lists every column as a separate block, so a row exists only in the geometry of the word boxes.

What the parser does for one leaf:
  1. words -> visual lines (vertical centre corrected for the tilt of the leaf)
  2. lines -> header lines (words of the column headings), title lines (type height), heading lines (name column only), footnote lines,
     anchor lines (a name and cells to the right), continuation lines (cells to the right only)
  3. a row = an anchor line plus the continuation lines below it up to the next anchor, heading, title or header; the name is the words of
     the name column of the row, every other word of the row is a remark word; both are kept in the order of the text layer
Nothing is corrected, completed or re-ordered: a word is what the text layer prints.
"""
import re, statistics, collections

HEADER_VOCAB = ['name', 'and', 'rank', 'residence', 'date', 'of', 'commisn', 'commis', 'issue', 'enlistment', 'muster', 'remarks']
HEADER_KEYS = ['name', 'rank', 'residence', 'date', 'commisn', 'commis', 'issue', 'enlistment', 'muster', 'remarks']

# printed rank headings (closed list of what the book prints; matching is on letters only, case-folded)
HEADINGS = [
    'captain', 'captains', '1st lieutenant', '1st lieutenants', '2d lieutenant', '2d lieutenants', 'sergeants', 'corporals', 'musicians',
    'musician', 'wagoner', 'wagoners', 'privates', 'colonel', 'colonels', 'lieut-colonel', 'lieut-colonels', 'major', 'majors', 'adjutant',
    'adjutants', 'quartermaster', 'quartermasters', 'surgeon', 'surgeons', 'asst-surgeon', 'asst-surgeons', 'chaplain', 'chaplains',
    'sergeant-major', 'sergeant-majors', 'q m-sergeant', 'q m-sergeants', 'q m-sergt', 'q m-sergts', 'com-sergeant', 'com-sergeants',
    'com-sergt', 'com-sergts', 'hospital steward', 'hospital stewards', 'prin musician', 'prin musicians', 'drum-major', 'drum-majors',
    'blacksmith', 'blacksmiths', 'saddler', 'saddlers', 'farrier', 'farriers', 'teamster', 'teamsters', 'band-master', 'band-masters',
    'leader', 'leaders', 'chief buglers', 'chief bugler', 'saddler sergeants', 'saddler sergeant', "regt'l commissaries",
    "regt'l commissary", 'veterinary sergeant', 'veterinary sergeants', 'bugler', 'buglers', 'fife-major', 'principal musician',
]


def _letters(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


HEAD_KEYS = {_letters(h): h for h in HEADINGS}


def lev(a, b, cap=3):
    """Levenshtein distance, cut off above cap."""
    if abs(len(a) - len(b)) > cap:
        return cap + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def heading_of(text):
    """(canonical heading, exact) when the text is a printed rank heading, tolerating OCR damage; (None, False) otherwise."""
    k = _letters(text)
    if not k:
        return None, False
    if k in HEAD_KEYS:
        return HEAD_KEYS[k], True
    # garbled: edit distance up to 2 (1 for short texts) to one printed heading
    best, bd = None, 9
    for hk, h in HEAD_KEYS.items():
        cap = 3 if len(hk) >= 10 else (2 if len(hk) >= 7 else 1)
        dd = lev(k, hk, cap)
        if dd <= cap and dd < bd:
            best, bd = h, dd
    return (best, False) if best else (None, False)


def is_header_word(t):
    k = re.sub(r'[^a-z]', '', t.lower())
    if not k:
        return False
    for v in HEADER_VOCAB:
        if k == v or (len(k) >= 5 and lev(k, v, 2) <= 2) or (len(k) >= 3 and len(v) >= 3 and lev(k, v, 1) <= 1 and len(k) == len(v)):
            return True
    return False


def line_height(ws):
    return statistics.median([w['yb'] - w['yt'] for w in ws])


def cluster_lines(ws, thr=14.0):
    """Visual lines: words sorted by corrected vertical centre; a word joins the last line when its centre lies within thr of the mean of
    the last four words of that line."""
    lines = []
    for w in sorted(ws, key=lambda w: (w['yk'], w['x0'])):
        if lines and abs(w['yk'] - statistics.mean(x['yk'] for x in lines[-1][-4:])) < thr:
            lines[-1].append(w)
        else:
            lines.append([w])
    for l in lines:
        l.sort(key=lambda w: w['x0'])
    return lines


def estimate_tilt(ws):
    byln = collections.defaultdict(list)
    for w in ws:
        byln[w['ln']].append(w)
    sl = []
    for l in byln.values():
        l = sorted(l, key=lambda w: w['x0'])
        if len(l) >= 6 and l[-1]['x0'] - l[0]['x0'] >= 400:
            k = max(2, len(l) // 3)
            a, b = l[:k], l[-k:]
            dx = statistics.mean(w['x0'] for w in b) - statistics.mean(w['x0'] for w in a)
            dy = statistics.mean(w['yc'] for w in b) - statistics.mean(w['yc'] for w in a)
            if dx > 0:
                sl.append(dy / dx)
    return statistics.median(sl) if sl else 0.0


# ------------------------------------------------------------------------------------------------ leaf analysis
FOOTNOTE_RE = re.compile(r'nlisted\s+for\s+one\s+[yv]e', re.I)
HDR_KEYS = ['residence', 'remarks', 'enlistment', 'muster', 'commisn', 'commiss', 'issue', 'rank', 'name']
MONTHS = ('jan', 'feb', 'mch', 'mar', 'apr', 'may', 'june', 'july', 'aug', 'sept', 'sep', 'oct', 'nov', 'dec')


def load_words(L):
    """Word dicts of one cached leaf (vt_cache.py): x0, x1, yt, yb, yc, w, conf, ln, off."""
    return [dict(x0=w[0], x1=w[1], yt=w[2], yb=w[3], yc=(w[2] + w[3]) / 2.0, w=w[4], conf=w[5], ln=w[6], off=w[7]) for w in L['words']]


def line_text(l):
    return ' '.join(w['w'] for w in l)


def _alpha(w):
    return re.sub(r'[^a-z]', '', w.lower())


def header_word(k):
    """Does the letters-only token k read as a column heading (damaged by at most the OCR slips seen on these pages)?"""
    if not k:
        return False
    if k in ('name', 'rank', 'issue', 'commisn', 'commis', 'commissn', 'residence', 'remarks', 'enlistment', 'muster'):
        return True
    n = len(k)
    if 4 <= n <= 6 and lev(k, 'muster', 1) <= 1 and abs(n - 6) <= 1:
        return True
    if lev(k, 'remarks', 2) <= 2 and abs(n - 7) <= 1:
        return True
    if (k.endswith('marks') or k.endswith('makks')) and n <= 9:
        return True
    if lev(k, 'residence', 2) <= 2 and abs(n - 9) <= 1:
        return True
    if lev(k, 'enlistment', 2) <= 2 and abs(n - 10) <= 1:
        return True
    if n >= 5 and (lev(k, 'commisn', 1) <= 1 or lev(k, 'issue', 1) <= 1) and k not in ('issued', 'tissue'):
        return True
    return False


HDR_VOCAB2 = ('date', 'of', 'dale', 'oi', 'ol', 'dato', 'dat', 'and', 'an', 'i', 'j', 'l', 'ateof', 'dateof', 'name', 'rank', 'namk')


def header_word_hits(l):
    return sum(1 for w in l if header_word(_alpha(w['w'])))


def is_header_line(l):
    """A line of the column headings (damaged or intact): most of its words are heading words or the small words of the headings."""
    toks = [_alpha(w['w']) for w in l]
    toks = [t for t in toks if t]
    if not toks or len(toks) > 24:
        return False
    hits = sum(1 for t in toks if header_word(t))
    rest = sum(1 for t in toks if not header_word(t) and t in HDR_VOCAB2)
    if hits >= 1 and hits + rest >= 0.7 * len(toks) and not any(month_like(w['w']) for w in l):
        return True
    if hits >= 2 and not any(month_like(w['w']) for w in l):
        return True
    return len(toks) <= 6 and all(t in HDR_VOCAB2 for t in toks) and any(t.startswith(('dat', 'dal', 'ate', 'dato')) for t in toks)


def tall(l, thr=36):
    hs = [w['yb'] - w['yt'] for w in l if sum(c.isalpha() for c in w['w']) >= 2]
    return bool(hs) and statistics.median(hs) >= thr


def month_like(t):
    k = _alpha(t)
    return len(k) >= 3 and any(k.startswith(m) for m in MONTHS)


def enlistment_peak(ws):
    """x0 of the column of the date of enlistment (commission): the peak of the month words that start a cell in [560, 1000], taken together
    with its partner (the muster column about 172 px further right).  None when the leaf has no table."""
    xs = []
    byln = collections.defaultdict(list)
    for w in ws:
        byln[w['ln']].append(w)
    for l in byln.values():
        l = sorted(l, key=lambda w: w['x0'])
        prev = None
        for w in l:
            if (prev is None or w['x0'] - prev['x1'] > 25) and month_like(w['w']) and 560 <= w['x0'] <= 1000:
                xs.append(w['x0'])
            prev = w
    if len(xs) < 4:
        return None
    h = collections.Counter(int(x // 8) for x in xs)
    mx = max(h.values())
    cands = sorted(b for b, c in h.items() if c >= max(3, 0.3 * mx))
    pick = None
    for b in cands:
        if any(abs((b2 - b) * 8 - 172) <= 24 for b2 in cands):
            pick = b
            break
    if pick is None:
        pick = cands[0]
    sel = [x for x in xs if abs(int(x // 8) - pick) <= 1]
    return statistics.median(sel)


FUNC_WORDS = set('the of and was to in that his he a by for with on at it as is were had be from who which him this'.split())


def is_prose(l, left, right, E):
    """A line of running text (a printed note below a table): no month word in a date column, and either it opens with 'Note' or its
    first word is a fragment in lower case with function words around it."""
    if E is not None and any(month_like(w['w']) and (abs(w['x0'] - E) <= 40 or abs(w['x0'] - (E + 172)) <= 40) for w in right):
        return False
    ltxt = line_text(left)
    if re.match(r'^Note\b', ltxt):
        return True
    fw = sum(1 for w in l if w['w'].lower().strip('.,;:"\'()') in FUNC_WORDS)
    return bool(left) and left[0]['w'][:1].islower() and fw >= 3 and len(l) >= 6


def classify_lines(lines, bx, E=None):
    """Kind of every line: header, title, heading (name column holds a printed rank heading), footnote, anchor (name and cells),
    nameonly (name, no cells), right (cells only)."""
    out = []
    for l in lines:
        left = [w for w in l if w['x0'] < bx]
        right = [w for w in l if w['x0'] >= bx]
        k = {'left': left, 'right': right, 'y': statistics.mean(w['yk'] for w in l), 'words': l, 'heading': None}
        if is_header_line(l):
            k['kind'] = 'header'
        elif tall(l) and title_like(l):
            k['kind'] = 'title'
        elif re.match(r'^\W*FINAL\s+STATEMENT', line_text(l), re.I):
            k['kind'] = 'title'
        elif FOOTNOTE_RE.search(line_text(l)):
            k['kind'] = 'footnote'
        elif left and is_prose(l, left, right, E):
            k['kind'] = 'prose'
        elif left:
            ltxt = line_text(left)
            h, exact = heading_of(ltxt)
            if h and not any(month_like(w['w']) for w in right):
                k['kind'] = 'heading'
                k['heading'] = (h, exact)
            else:
                k['kind'] = 'anchor' if right else 'nameonly'
        else:
            k['kind'] = 'right'
        out.append(k)
    return out


TITLE_WORDS = re.compile(r'regiment|statement|losses|aggregate|battalion|cavalry|battery|company|compan|comap|staff|band|recruits|unassigned|general', re.I)


def title_like(l):
    t = line_text(l)
    return bool(TITLE_WORDS.search(t)) or title_of(l)[0] is not None


COMPANY_SEQ = 'ABCDEFGHIKLM'


def title_of(l):
    """(company/section code, damaged?) of a title line; code '?' when the word COMPANY stands without its letter."""
    t = line_text(l)
    if re.match(r'^\W*COM\w*\W*$', t.strip()):
        return '?', True
    m = re.match(r'^\W*COM\w*\s+([A-Z])\W*$', t.strip())
    if m:
        return m.group(1), t.strip() not in ('COMPANY ' + m.group(1) + '.',)
    k = _alpha(t)
    if k.startswith('fieldand') or k.startswith('fieldstaff') or k in ('fieldandstaff',):
        return 'FS', k != 'fieldandstaff'
    if k.startswith('noncommissioned') or k.startswith('noncom'):
        return 'NCS', k != 'noncommissionedstaff'
    if k.startswith('band'):
        return 'BAND', k != 'band'
    return None, True


JUNK_CH = set('IiljJ1!|-\u2014\u2022^\u25a0.,:;\u00bb\u00ab~\u2018\u2019"\'*\u00ac')


def junk_token(t):
    """A mark the text layer reads from a rule, a stain or the edge of the page: one or two characters that make no word."""
    if len(t) <= 2 and all(c in JUNK_CH for c in t):
        return True
    return len(t) <= 2 and not any(c.isalpha() and c not in 'IiljJV' for c in t) and not any(c.isdigit() and c != '1' for c in t) and any(not c.isalnum() for c in t)


def junk_line(words):
    return all(junk_token(w['w']) for w in words)


def page_number_line(words, y):
    toks = [w['w'] for w in words]
    return (y > 2780 or y < 200) and len(toks) <= 3 and all(len(t) <= 6 for t in toks) and any(any(c.isdigit() for c in t) for t in toks)


def analyse_leaf(leaf, L, state):
    """Cut the rows of one leaf.  state: {'co', 'rk'} carried from the leaf before (modified in place).
    Returns (rows, events, info)."""
    ws = load_words(L)
    t = estimate_tilt(ws)
    for w in ws:
        w['yk'] = w['yc'] - t * (w['x0'] - 180)
    lines = cluster_lines(ws)
    E = enlistment_peak(ws)
    info = {'leaf': leaf, 'pg': L['pg'], 'n_words': len(ws), 'tilt': t, 'E': E}
    events, rows = [], []
    if E is None:
        info['table'] = False
        # titles still count (a company title can stand on a leaf whose table has no month words; rare): report only
        for l in lines:
            if tall(l):
                events.append(('title-nontable', statistics.mean(w['yk'] for w in l), line_text(l)))
        return rows, events, info
    bx = E - 237
    info.update({'table': True, 'bx': bx, 'cols': {'res': E - 30, 'enl_end': E + 135, 'mus_end': E + 310}})
    kl = classify_lines(lines, bx, E)
    for i in range(1, len(kl)):                      # the lines that go on a printed note
        k, pk0 = kl[i], kl[i - 1]
        if k['kind'] == 'anchor' and pk0['kind'] == 'prose' and k['left'][0]['w'][:1].islower() and not any(
                month_like(w['w']) and (abs(w['x0'] - E) <= 40 or abs(w['x0'] - (E + 172)) <= 40) for w in k['right']):
            k['kind'] = 'prose'
    in_table = False
    saw_header = False
    cur = None
    stray = []
    last_y = None
    prev_k = None

    def close():
        nonlocal cur
        if cur is not None:
            if cur.get('orphan'):
                lw = sorted(cur['cells'], key=lambda w: (w['yk'], w['x0']))
                if header_word_hits(lw) >= 1 or 'issue' in _alpha(line_text(lw)) or 'commis' in _alpha(line_text(lw)):
                    events.append(('header-remnant', cur['y'], line_text(lw)[:100]))
                else:
                    events.append(('row-without-name', cur['y'], ' / '.join(line_text(sorted([w for w in lw if w['rl'] == i], key=lambda w: w['x0']))
                                                                           for i in sorted({w['rl'] for w in lw}))[:300]))
            else:
                rows.append(cur)
            cur = None

    for k in kl:
        kind, y = k['kind'], k['y']
        txt = line_text(k['words'])
        pk, prev_k = prev_k, k
        if kind == 'header':
            close()
            in_table = True
            saw_header = True
            stray = []
            continue
        if kind == 'title':
            close()
            code, damaged = title_of(k['words'])
            if code == '?':
                prev = state['co']
                code = COMPANY_SEQ[COMPANY_SEQ.index(prev) + 1] if prev in COMPANY_SEQ and COMPANY_SEQ.index(prev) + 1 < len(COMPANY_SEQ) else ''
                events.append(('title-letter-lost', y, txt + ' -> sequence after %s' % prev))
                state['co_inferred'] = True
            else:
                state['co_inferred'] = False
            if code:
                state['co'] = code
                state['rk'] = ''
                events.append(('title', y, txt + ('  [damaged]' if damaged else '')))
            else:
                events.append(('title-unknown', y, txt))
            in_table = False
            continue
        if not in_table:
            if not saw_header and kind == 'anchor' and y > 200 and \
                    any(month_like(w['w']) and abs(w['x0'] - E) <= 25 for w in k['right']) and \
                    any(month_like(w['w']) and abs(w['x0'] - (E + 172)) <= 30 for w in k['right']):
                in_table = True            # leaf whose heading block the text layer lost: the table starts at its first line with a date
                events.append(('implicit-table-start', y, txt[:80]))
                if pk is not None and pk['kind'] == 'heading' and y - pk['y'] <= 100:
                    state['rk'] = line_text(pk['left'])           # the rank heading just above the first row
                    events.append(('heading', pk['y'], state['rk'] + ('' if pk['heading'][1] else '  [damaged]')))
            else:
                events.append(('non-table-line', y, txt[:80]))
                continue
        if kind == 'heading':
            close()
            state['rk'] = line_text(k['left'])
            if k['right'] and junk_line(k['right']):
                events.append(('heading-noise-dropped', y, line_text(k['right'])))
            elif k['right']:
                stray.extend(k['right'])
                events.append(('heading-with-right-words', y, txt[:100]))
            events.append(('heading', y, state['rk'] + ('' if k['heading'][1] else '  [damaged]')))
            last_y = y
            continue
        if kind == 'footnote':
            close()
            events.append(('footnote', y, txt[:100]))
            continue
        if kind == 'prose':
            close()
            events.append(('page-note', y, txt[:160]))
            continue
        if kind == 'anchor':
            close()
            for w in k['right']:
                w['rl'] = 0
            for w in stray:
                w['rl'] = -1
            cur = {'left': list(k['left']), 'cells': list(k['right']) + stray, 'y': y, 'last_y': y, 'rk': state['rk'], 'co': state['co'],
                   'stray': bool(stray), 'leaf': leaf, 'nlines': 1}
            stray = []
            continue
        if kind == 'nameonly':
            if junk_line(k['left']):
                events.append(('noise-line-dropped', y, txt[:60]))
                continue
            # a name whose cells were not found on its line: a hanging name (second line) or an unplaced name
            if cur is not None and y - cur['last_y'] <= 45 and k['left'][0]['x0'] > min(w['x0'] for w in cur['left']) + 20:
                cur['left'].extend(k['left'])
                cur['last_y'] = y
                cur['nlines'] += 1
                events.append(('name-continued', y, txt[:100]))
            else:
                close()
                for w in stray:
                    w['rl'] = -1
                cur = {'left': list(k['left']), 'cells': list(stray), 'y': y, 'last_y': y, 'rk': state['rk'], 'co': state['co'],
                       'stray': bool(stray), 'leaf': leaf, 'nlines': 1, 'nameonly': True}
                stray = []
                events.append(('name-only-line', y, txt[:100]))
            continue
        if kind == 'right':
            if junk_line(k['right']):
                events.append(('noise-line-dropped', y, txt[:60]))
            elif page_number_line(k['right'], y):
                events.append(('page-number', y, txt[:60]))
            elif any(E - 30 <= w['x0'] < E + 310 and not junk_token(w['w']) and len(w['w']) > 1 for w in k['right']) and not (
                    cur is not None and cur.get('nameonly') and not cur['cells'] and y - cur['last_y'] <= 45):
                close()
                for w in k['right']:
                    w['rl'] = 0
                cur = {'left': [], 'cells': list(k['right']), 'y': y, 'last_y': y, 'rk': state['rk'], 'co': state['co'], 'orphan': True,
                       'leaf': leaf, 'nlines': 1}
            elif cur is not None and y - cur['last_y'] <= 62:
                for w in k['right']:
                    w['rl'] = cur['nlines']
                cur['cells'].extend(k['right'])
                cur['last_y'] = y
                cur['nlines'] += 1
                if any(w['x0'] < E - 30 and not junk_token(w['w']) for w in k['right']):
                    events.append(('wrapped-residence', y, txt[:100]))
            else:
                events.append(('orphan-right-words', y, txt[:100]))
            continue
    close()
    if stray:
        events.append(('stray-right-words-unplaced', 0, line_text(stray)[:100]))
    info['rows'] = len(rows)
    return rows, events, info
