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
        cap = 2 if len(hk) >= 7 else 1
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
