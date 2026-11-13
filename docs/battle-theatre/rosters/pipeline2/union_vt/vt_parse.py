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
FOOTNOTE_RE = re.compile(r'enlisted\s+for\s+one\s+year', re.I)
HDR_KEYS = ['residence', 'remarks', 'enlistment', 'muster', 'commisn', 'commiss', 'issue', 'rank', 'name']
MONTHS = ('jan', 'feb', 'mch', 'mar', 'apr', 'may', 'june', 'july', 'aug', 'sept', 'sep', 'oct', 'nov', 'dec')


def load_words(L):
    """Word dicts of one cached leaf (vt_cache.py): x0, x1, yt, yb, yc, w, conf, ln, off."""
    return [dict(x0=w[0], x1=w[1], yt=w[2], yb=w[3], yc=(w[2] + w[3]) / 2.0, w=w[4], conf=w[5], ln=w[6], off=w[7]) for w in L['words']]


def line_text(l):
    return ' '.join(w['w'] for w in l)


def _alpha(w):
    return re.sub(r'[^a-z]', '', w.lower())


def header_word_hits(l):
    """Number of words of the line that are (damaged) column headings."""
    n = 0
    for w in l:
        k = _alpha(w['w'])
        if len(k) < 3:
            continue
        for h in HDR_KEYS:
            if k == h:
                n += 1
                break
            if len(h) >= 5 and len(k) >= 5 and abs(len(k) - len(h)) <= 2:
                cap = 3 if len(h) >= 7 else 2
                if lev(k, h, cap) <= cap:
                    n += 1
                    break
    return n


def is_header_line(l):
    """A line of the column headings: a (damaged) heading word on a short line without a date, or the 'Date of' lines."""
    hits = header_word_hits(l)
    if hits >= 2 and sum(1 for w in l if month_like(w['w'])) <= 1:
        return True
    if len(l) <= 9 and hits >= 1 and not any(month_like(w['w']) for w in l):
        return True
    toks = [_alpha(w['w']) for w in l if _alpha(w['w'])]
    return bool(toks) and len(toks) <= 6 and all(t in ('date', 'of', 'dale', 'oi', 'ol', 'dato', 'dat', 'i', 'j', 'l', 'ateof', 'dateof') for t in toks) \
        and any(t.startswith(('dat', 'dal', 'ate')) for t in toks)


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


def classify_lines(lines, bx):
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
        elif FOOTNOTE_RE.search(line_text(l)):
            k['kind'] = 'footnote'
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


def title_of(l):
    """(company/section code, damaged?) of a title line."""
    t = line_text(l)
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
    kl = classify_lines(lines, bx)
    in_table = False
    saw_header = False
    cur = None
    stray = []
    last_y = None

    def close():
        nonlocal cur
        if cur is not None:
            rows.append(cur)
            cur = None

    for k in kl:
        kind, y = k['kind'], k['y']
        txt = line_text(k['words'])
        if kind == 'header':
            close()
            in_table = True
            saw_header = True
            stray = []
            continue
        if kind == 'title':
            close()
            code, damaged = title_of(k['words'])
            if code:
                state['co'] = code
                state['rk'] = ''
                events.append(('title', y, txt + ('  [damaged]' if damaged else '')))
            else:
                events.append(('title-unknown', y, txt))
            in_table = False
            continue
        if not in_table:
            if not saw_header and kind == 'anchor' and y > 200 and any(month_like(w['w']) for w in k['right']) and \
                    sum(1 for w in k['words'] if month_like(w['w'])) >= 1:
                in_table = True            # leaf whose heading block the text layer lost: the table starts at its first line with a date
                events.append(('implicit-table-start', y, txt[:80]))
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
        if kind == 'anchor':
            close()
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
            elif cur is not None and y - cur['last_y'] <= 62:
                cur['cells'].extend(k['right'])
                cur['last_y'] = y
                cur['nlines'] += 1
            else:
                events.append(('orphan-right-words', y, txt[:100]))
            continue
    close()
    if stray:
        events.append(('stray-right-words-unplaced', 0, line_text(stray)[:100]))
    info['rows'] = len(rows)
    return rows, events, info
