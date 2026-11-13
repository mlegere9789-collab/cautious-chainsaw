"""Rows of the 1867 Alphabetical Index (Supplement to the Annual Reports of the Adjutant General of Maine), from word boxes.

Every printed line of the index is one volunteer: Name | Rank | Company | Regiment | Corps.  The four lists of the volume share the
columns (pp. 3-506 volunteers April 1861 to January 1863; 617-1210 volunteers from January 1863; the transferred men and the drafted
men and substitutes of 1863 have other columns and are not read here).

parse_leaf(leaf, words)  ->  (rows, notes)
  words: aligned word boxes (mlib.xml_leaves + mlib.align); a row is a dict
    name, rank, co, rg, cp : lists of words (each word has 'off')      y: vertical centre      flags: list of strings
Columns are found by the horizontal position of each cell relative to the left edge of the name column of the leaf (A):
rank from A+500, company from A+850, regiment from A+1170, corps from A+1450 (the table is printed in one form on every page;
checked on the 1,200 leaves, see the band statistics in the report).  A cell is a run of words whose gaps are at most 28 pixels.
"""
import re, statistics, collections
import mtable as T

HDR = re.compile(r'(?i)^(?:JN?)?(name|rank|bank|hank|kank|company|regiment|corps|xame|nanK)\W*$')
HDR2 = re.compile(r'(?i)(?:^|\W)(?:ame|ank|ompany|egiment|egimen|orps)\W*$')
TITLE = re.compile(r'(?i)^(?:volunteers?|persons|drafted|transferred|furnished|substitutes|organizations|vol\S{3,8}rs)\W*$')
RUNHEAD = re.compile(r'^(?:ALPHABETICAL|INDEX\.?|ADJUTANT|GENERAL.?S|REPORT\.?)$')
BANDS = (('rank', 500), ('co', 850), ('rg', 1170), ('cp', 1450))      # left edge of the cell, relative to A
THR_ROW = 22.0
GAP = 28


def _is_head_row(r):
    toks = [w['w'] for w in r]
    n_hdr = sum(1 for t in toks if HDR.match(t) or HDR2.search(t))
    if n_hdr >= 2:
        return True
    if toks and HDR.match(toks[0]) and len(toks) >= 2 and sorted(r, key=lambda w: w['x0'])[0]['w'] == toks[0]:
        return True
    if any(TITLE.match(t) for t in toks) and any(t.lower() == 'list' or t.lower() == 'of' for t in toks):
        return True
    if any(RUNHEAD.match(t) for t in toks):
        return True
    if any('Continued' in t or t.startswith('(Con') for t in toks) and len(toks) <= 4:
        return True
    return False


def split_head_body(words):
    """Rows of the leaf above the first data row are head (running head, title, column headings)."""
    rs = T.cluster_rows(words, THR_ROW)
    last = -1
    for i, r in enumerate(rs[:8]):
        if _is_head_row(r):
            last = i
    return rs[:last + 1], rs[last + 1:]


def _anchor(words):
    xs = sorted(w['x0'] for w in words)
    return xs[int(len(xs) * 0.05)] if xs else 0


def _tilt(words, A):
    """Slope of the lines: median vertical offset between a corps-column word and the name line nearest to it."""
    names = [w for w in words if w['x0'] < A + 60]
    cps = [w for w in words if w['x0'] > A + 1450 and re.match(r'^(?:Infantry|do|Cavalry)', w['w'])]
    if len(names) < 10 or len(cps) < 10:
        return 0.0
    d = []
    for c in cps:
        n = min(names, key=lambda n: abs(n['yc'] - c['yc']))
        if abs(c['yc'] - n['yc']) < 30:
            d.append((c['yc'] - n['yc']) / max(1.0, c['x0'] - n['x0']))
    return statistics.median(d) if d else 0.0


def parse_leaf(leaf, words):
    notes = []
    ws = [w for w in words if w.get('off') is not None]
    unal = [w for w in words if w.get('off') is None]
    if not ws:
        return [], ['no words']
    head, body = split_head_body(ws)
    bw = [w for r in body for w in r]
    if len(bw) < 20:
        return [], ['no body']
    A = _anchor(bw)
    s = _tilt(bw, A)
    for w in bw:
        w['yc2'] = w['yc'] - s * (w['x0'] - A)
    rs = []
    for w in sorted(bw, key=lambda w: w['yc2']):
        if rs and abs(w['yc2'] - statistics.mean(x['yc2'] for x in rs[-1][-3:])) < THR_ROW:
            rs[-1].append(w)
        else:
            rs.append([w])
    rows = []
    for r in rs:
        r = sorted(r, key=lambda w: w['x0'])
        name = [w for w in r if w['x0'] < A + 500]
        rest = [w for w in r if w['x0'] >= A + 500]
        row = {'name': name, 'rank': [], 'co': [], 'rg': [], 'cp': [], 'y': statistics.mean(w['yc'] for w in r), 'flags': [], 'leaf': leaf}
        if rest:
            for cell in T.cells_of(rest, GAP):
                x0 = cell[0]['x0'] - A
                band = 'rank'
                for b, edge in BANDS:
                    if x0 >= edge:
                        band = b
                row[band].extend(cell)
        if not name:
            row['flags'].append('no-name')
        if any(w.get('unal') for w in r):
            row['flags'].append('unaligned-word')
        rows.append(row)
    if unal:
        notes.append('%d unaligned words dropped' % len(unal))
    return rows, notes


# ---------------------------------------------------------------------------------------------- unit assignment

UNITS = {
    '3': 'u-me-3rd-maine-infantry', '4': 'u-me-4th-maine-infantry', '5': 'u-me-5th-maine-infantry', '6': 'u-me-6th-maine-infantry',
    '7': 'u-me-7th-maine-infantry', '16': 'u-me-16th-maine-infantry', '17': 'u-me-17th-maine-infantry',
    '19': 'u-me-19th-maine-infantry', '20': 'u-me-20th-maine-infantry',
}
CAV_KEY = 'u-me-1st-maine-cavalry'
BAT_KEYS = {'2d': 'u-me-2nd-maine-battery-b', '5th': 'u-me-5th-maine-battery-e', '6th': 'u-me-6th-maine-battery-f'}
BN10_KEY = 'u-me-10th-maine-infantry'

RE_INF = re.compile(r'^Infantr[yv][.,*]?$')
RE_CAV = re.compile(r'^Cavalr[yv][.,]?$')
RE_DITTO = re.compile(r"^(?:do|Do)[.\s'•*,]*$")
RE_MOUNTED = re.compile(r'^Mounted Artillery[.,]?$')
RE_NUM = re.compile(r'^\d{1,2}$')
RE_BN10 = re.compile(r'^10th Infantr[yv][.,]?$')
RE_BAT = re.compile(r"^[\u2022*'.\s]*(\d)\s?(d|th|st)\s?[-.]?\s?[Bb]at\s?[.,']*$")
# cells that are OCR damage of a ditto mark (two letters, or two such tokens), never a corps name
RE_DITTO_DAMAGED = re.compile(r"^(?:[A-Za-z]{1,3}\s)?(?:uo|UO|ao|AO|do|Uo|uO|oo|OO|dn|DO|vo|Vo|ilo|dc|cio|clo|dd)[.\s'•*]*$")


def corps_kind(cp_text):
    """('inf'|'cav'|'mounted'|'bn10'|'ditto'|'ditto?'|'blank'|'other', exact)  exact is False for a cell that needed a tolerance."""
    t = cp_text.strip()
    if not t:
        return 'blank', True
    if t in ('Infantry.', 'Infantry,'):
        return 'inf', True
    if RE_INF.match(t):
        return 'inf', False
    if t in ('Cavalry.', 'Cavalry,'):
        return 'cav', True
    if RE_CAV.match(t):
        return 'cav', False
    if t in ('Mounted Artillery.', 'Mounted Artillery,', 'Mounted Artillery'):
        return 'mounted', t.endswith('.')
    if t in ('10th Infantry.', '10th Infantry,'):
        return 'bn10', True
    if t == 'do' or t == 'do.':
        return 'ditto', True
    if RE_DITTO.match(t):
        return 'ditto', False
    if RE_DITTO_DAMAGED.match(t):
        return 'ditto?', False
    return 'other', True


RE_NUM_NOISE = re.compile(r"^(\d{1,2})[\s'\-.\u2022,*`:;~]+$|^[\s'\-.\u2022,*`:;~]+(\d{1,2})$")


def regiment_kind(rg_text):
    """('num', n) | ('num2', n) split or noisy numeral | ('battalion', None) | ('other', text) | ('blank', None)"""
    t = rg_text.strip()
    if not t:
        return 'blank', None
    if RE_NUM.match(t):
        return 'num', int(t)
    m = re.match(r'^(\d)\s(\d)$', t)                  # a two digit numeral that the OCR split into two tokens
    if m:
        return 'num2', int(m.group(1) + m.group(2))
    m = RE_NUM_NOISE.match(t)                           # digits only, with punctuation noise glued on
    if m:
        return 'num2', int(m.group(1) or m.group(2))
    if t == 'Battalion':
        return 'battalion', None
    return 'other', t


def assign(rows):
    """Adds r['unit'], r['basis'] and r['why'] to every row of one list, in reading order.  A ditto in the corps column repeats the
    last corps text printed above in the same list.  Returns counters."""
    carry = None                                         # ('inf'|'cav'|... , row index of the explicit corps)
    cnt = collections.Counter()
    for i, r in enumerate(rows):
        rg_t = T.text_of(r['rg']) if r['rg'] else ''
        cp_t = T.text_of(r['cp']) if r['cp'] else ''
        co_t = T.text_of(r['co']) if r['co'] else ''
        ck, cexact = corps_kind(cp_t)
        rk_, rv = regiment_kind(rg_t)
        # a battalion cell that the gap rule merged with its corps cell ("Battalion 10th Infantry.")
        if rg_t.startswith('Battalion') and not cp_t:
            m = re.match(r'^Battalion\s+(10th Infantr[yv][.,]?)$', rg_t)
            if m:
                rk_, rv, ck, cexact = 'battalion', None, 'bn10', True
        resolved, how = None, 'explicit'
        if ck in ('inf', 'cav', 'mounted', 'bn10', 'other'):
            resolved = ck
            carry = (ck, i)
        elif ck == 'ditto':
            resolved, how = (carry[0] if carry else None), 'ditto'
        elif ck == 'ditto?':
            resolved, how = (carry[0] if carry else None), 'ditto-damaged'
        r['corps_text'], r['rg_text'], r['co_text'] = cp_t, rg_t, co_t
        r['corps_kind'], r['corps_how'], r['rg_kind'] = resolved, how, rk_
        unit, basis, bat_exact = None, '', True
        if rk_ in ('num', 'num2') and resolved == 'inf' and str(rv) in UNITS:
            unit = UNITS[str(rv)]
            basis = 'numeral+infantry'
        elif rk_ in ('num', 'num2') and rv == 1 and resolved == 'cav':
            unit, basis = CAV_KEY, 'numeral+cavalry'
        elif resolved == 'mounted':
            m = RE_BAT.match(co_t)
            if m and m.group(1) + m.group(2) in BAT_KEYS:
                unit, basis = BAT_KEYS[m.group(1) + m.group(2)], 'battery+mounted artillery'
                bat_exact = bool(re.match(r'^\d(?:d|th) Bat\.$', co_t))
        elif rk_ == 'battalion' and resolved == 'bn10':
            unit, basis = BN10_KEY, 'battalion+10th infantry'
        r['unit'], r['basis'] = unit, basis
        r['damaged_unit_cells'] = bool(unit) and (how == 'ditto-damaged' or rk_ == 'num2' or not cexact or not bat_exact)
        cnt[unit or '-'] += 1
    return cnt
