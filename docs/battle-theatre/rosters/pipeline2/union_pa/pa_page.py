"""Page analyser of the Bates roll pages: word boxes of one leaf -> headings, rows, and the lines that are neither.

A roll page of Bates (three years' service and later) is a table:   name | rank | date of muster into service | [term digit] | remarks
The text layer lists every column as a block of its own, so a row exists only in the geometry of the word boxes.  This module
  1. puts the words on visual lines (vertical centre corrected for the tilt of the leaf)
  2. finds the column anchors of the leaf from its own words (the column of month words that begins the date cell, the rank column)
  3. sorts every line into header, heading, note, anchor line (a printed table line) or continuation line (a wrapped remark)
  4. cuts the cells of every row:  name words, rank words, every other word (date, term digit, remarks)
Nothing is corrected or completed; a word is what the text layer prints.  The only cut inside a word is where the text layer glued the
name cell to the rank cell with leader dots ("F....l...do"): pa_tok.split_glued says where.
"""
import re, statistics, collections
import pa_geom as G
import pa_tok as T

HEAD_WORDS = ['name', 'rank', 'date', 'of', 'muster', 'into', 'service', 'remarks', 'term', 'enlistment', 'mustered', 'in', 'and']


def _alpha(w):
    return re.sub(r'[^a-z]', '', w.lower())


def header_word(k):
    if not k:
        return False
    if k in ('name', 'rank', 'remarks', 'muster', 'service', 'date', 'into', 'term', 'namb', 'hame', 'kame', 'xame', 'sane', 'same'):
        return k not in ('same',)
    n = len(k)
    if n >= 5 and (T.lev(k, 'remarks', 2) <= 2 or T.lev(k, 'muster', 2) <= 2 and n >= 5 or T.lev(k, 'service', 2) <= 2 and n >= 6):
        return True
    if n >= 4 and (T.lev(k, 'name', 1) <= 1 or T.lev(k, 'rank', 1) <= 1) and n == 4:
        return True
    return False


def is_header_line(toks):
    """Column heading line ("NAME. RANK. DATE OF MUSTER INTO SERVICE. REMARKS.", or one of its two printed lines, damaged or intact)."""
    ks = [_alpha(t) for t in toks]
    ks = [k for k in ks if k]
    if not ks or len(ks) > 14:
        return False
    hits = sum(1 for k in ks if header_word(k))
    small = sum(1 for k in ks if k in ('of', 'op', 'ol', 'oi', 'date', 'dale', 'into', 'and', 'in', 'i', 'l', 'j'))
    if any(T.is_month_loose(t) for t in toks):
        return False
    return hits >= 1 and hits + small >= 0.7 * len(ks)


_SERVICE_RE = re.compile(r'(three|thkee|thbee|theee|threb|tiiree|tiikee|tiiree|thue|nine|one|six|twelve|two|four|five)', re.I)


def is_service_line(toks):
    """"THREE YEARS' SERVICE." (recto running head), "FIFTEENTH CAVALRY - THREE YEARS' SERVICE." and the like, damaged or intact."""
    ks = [_alpha(t) for t in toks]
    ks = [k for k in ks if k]
    sv = any(len(k) >= 5 and T.lev(k, 'service', 2) <= 2 for k in ks)
    yr = any((len(k) >= 4 and (T.lev(k, 'years', 2) <= 2 or T.lev(k, 'months', 2) <= 2 or T.lev(k, 'year', 1) <= 1 or T.lev(k, 'tears', 1) <= 1))
             for k in ks)
    return sv and (yr or len(ks) <= 3)


def is_regiment_head(toks):
    s = ' '.join(toks)
    k = _alpha(s)
    return bool(re.search(r'reg[il]?m[eb]|eeg[il]?m|keg[il]?m|regmen|regim|egime|reserve|cavalry|cavalhy|oavalry|artillery|aetillery', k)) and len(toks) <= 14 and not any(
        T.is_month(t) for t in toks)


COMPANY_RE = re.compile(r"^(?:C[o0Q]mp[a-z]{0,4}|Battery|BATTERY|COMPANY|Troop|TROOP|Comp|C0MPANY)$")


def heading_of(toks):
    """Company or section heading: ('company', letter) | ('fs', '') | ('band', '') | ('unassigned', '') | ('recruits', '') | ... | None."""
    if not toks:
        return None
    s = ' '.join(toks)
    k = _alpha(s)
    if re.search(r'field.{0,3}and.{0,3}staff|fiel.{0,3}and.{0,3}st[ae]|fielda.{0,3}staff|stafpofficers|staffofficers', k) or \
            (re.search(r'(field|fiold|fjeld)', k) and re.search(r'(staff|stafe|stapf|staef)', k)):
        return ('fs', '')
    if len(toks) <= 4 and re.search(r'(regimental|rcgimental|egimental)?\s*band', s.lower()) and 'band' in k and len(k) <= 22:
        return ('band', '')
    if re.search(r'non.?commiss', k) or re.search(r'noncommiss', k):
        return ('ncs', '')
    if re.search(r'unassigned|unassign|unasigned|iinassigned|unassiqned', k) or k.startswith('unass') or k.startswith('tjnass') or k.startswith('tinass'):
        return ('unassigned', '')
    if re.search(r'^recruits?$', k) or re.search(r'unattached|unas', k):
        return ('unassigned', '')
    # company / battery heading: the word "Company" (or Battery, Troop) may be split or damaged by the text layer ("Co MPAN T B .", "COMPAjVfY G.")
    acc, k = '', 0
    word = None
    while k < len(toks) and len(acc) < 7:
        acc += re.sub(r'[^A-Za-z0-9]', '', toks[k])
        k += 1
    accl = acc.lower()
    if len(accl) >= 7 and accl[0] in 'cb' and len(toks) <= 8 and toks[0][:1] in ('C', 'B', 'c', 'b') and (toks[0][:1].isupper() or toks[0][:2].isupper()):
        if accl[0] == 'c' and T.lev(accl[:7], 'company', 2) <= 2:
            word = 'company'
        elif accl[0] == 'b' and T.lev(accl[:7], 'battery', 2) <= 2:
            word = 'battery'
    if word is None and len(accl) == 5 and accl == 'troop':
        word = 'troop'
    if word and not any(T.is_month(t) for t in toks):
        rest = toks[k:]
        extra = len(acc) - 7
        if k == 1 and extra >= 2:
            pass                                   # one damaged word of 9 or 10 characters: the word itself, the letter follows
        elif extra == 1 and not rest:
            return ('company', acc[7].upper() if acc[7].isalpha() else '?')   # the letter glued to the word ("COMPANYB.")
        if not rest:
            return ('company', '?')
        t1 = re.sub(r'[^A-Za-z0-9]', '', rest[0])
        after = rest[1:]
        # after the letter: nothing, or the place of recruitment ("recruited at ..."), or marks; a remark ("company H - date unknown") is no heading
        ok_after = (not after) or RECRUIT_RE.match(re.sub(r'^[^A-Za-z]+', '', after[0])) or all(not re.sub(r'[^A-Za-z0-9]', '', t) for t in after)
        if (len(t1) == 1 or (len(t1) == 2 and t1[0] == t1[1])) and ok_after:
            return ('company', t1[0].upper())
        if (t1 == '' or RECRUIT_RE.match(t1)) and ok_after:
            return ('company', '?')
    return None


def build_lines(ws):
    tilt = G.estimate_tilt(ws)
    return tilt, G.cluster_lines(ws, tilt)


# ------------------------------------------------------------------------------------------------------------------ the leaf

NOTE_RE = re.compile(r'following\s+abbrev|abbreviat|prepara?tion\s+of\s+rem|used\s+in\s+the\s+prep', re.I)
RECRUIT_RE = re.compile(r'^(?:rec|bec|kec|reo|rec\^|kooruit|keor|eeor|recr|recruit|raised|organi[sz]ed|enrolled|mustered|recruitl)', re.I)
MARKS = re.compile(r"^[^A-Za-z0-9]*$")


def tok_text(l):
    return [w['w'] for w in l]


def line_txt(l):
    return ' '.join(w['w'] for w in l)


def line_height(l):
    hs = [w['yb'] - w['yt'] for w in l if sum(c.isalpha() for c in w['w']) >= 2]
    return statistics.median(hs) if hs else 0


def analyse_leaf(rec, ctx):
    """ctx: dict carried from leaf to leaf of one unit: 'xd_ratio' (date column as a share of the page width), 'rk_ratio' (rank column),
    'letter' (last company letter).  Returns a dict:
      info    leaf, pg, W, xd, nd, B1, B2, geometry source, tilt, line counts
      items   in page order: ('heading', kind, letter, text, y) | ('row', rowdict) | ('skip', kind, text, y) | ('orphan', text, y, why)
    Row dict: name_w, rank_w, rank_str, post_w (all other words, in page order), marks_w, lines (number of visual lines), y, glued (cut word or None),
              flags (set of short codes), line_idx
    """
    ws = G.load_words(rec)
    out = {'info': {'leaf': rec['leaf'], 'pg': rec['pg'], 'words': len(ws)}, 'items': []}
    if not ws:
        out['info']['kind'] = 'empty'
        return out
    W = max(w['x1'] for w in ws)
    out['info']['W'] = W
    tilt, lines = build_lines(ws)
    out['info']['tilt'] = round(tilt, 5)
    out['info']['lines'] = len(lines)
    # --- is this a table page?  Table lines have wide gaps between their cells, narrative lines do not
    wide = tot = 0
    for l in lines:
        if len(l) >= 3:
            tot += 1
            if max(l[k + 1]['x0'] - l[k]['x1'] for k in range(len(l) - 1)) >= 0.03 * W:
                wide += 1
    out['info']['table_score'] = round(wide / tot, 2) if tot else 0.0
    # --- the date column: the peak of the month words that start a date cell
    mw = [w for w in ws if T.is_month(w['w']) and w['x0'] < 0.58 * W]
    xd, nd = G.peak([w['x0'] for w in mw], width=max(30, 0.02 * W), minn=3)
    src = 'page'
    if xd is None and ctx.get('xd_ratio'):
        xd = ctx['xd_ratio'] * W
        src = 'inherited'
    elif xd is not None:
        # refine to the members of the peak
        mem = [w['x0'] for w in mw if abs(w['x0'] - xd) <= 0.03 * W]
        xd = statistics.median(mem)
        nd = len(mem)
    out['info'].update(xd=None if xd is None else round(xd), nd=nd, xd_source=src if xd is not None else 'none')
    if xd is None or src == 'inherited' or nd < 5:
        ts = out['info']['table_score']
        if src == 'inherited' and ts >= 0.3:
            pass          # a table page whose date column the text layer lost: the columns of the neighbouring page are used
        else:
            out['info']['kind'] = 'no-date-column' if (ts >= 0.3 and xd is None) else 'narrative'
            if out['info']['kind'] == 'narrative' or xd is None:
                return out
    ctx['xd_ratio'] = xd / W if src == 'page' else ctx.get('xd_ratio')
    B2 = xd - 0.042 * W            # left of this: name and rank cells; right of it: date, term digit and remarks
    out['info']['B2'] = round(B2)
    # --- the left margin of the names: where the name cells start (low quantile of the first x0 of the lines that carry a month)
    starts = []
    for l in lines:
        if any(T.is_month(w['w']) and abs(w['x0'] - xd) <= 0.03 * W for w in l):
            starts.append(l[0]['x0'])
    xn = statistics.median(starts) if starts else None
    out['info']['xn'] = None if xn is None else round(xn)
    # --- the rank column: left edge of the ditto marks and rank words that stand right of the names
    rk = []
    for l in lines:
        if any(T.is_month(w['w']) and abs(w['x0'] - xd) <= 0.03 * W for w in l):
            for w in l:
                if w['x0'] < B2 and (T.is_ditto(w['w']) or (T.rank_like(w['w']) and T.core(w['w']).lower() in ('private', 'capt', 'corp', 'priv'))):
                    rk.append(w['x0'])
    xr = G.peak(rk, width=max(25, 0.015 * W), minn=3)[0] if rk else None
    if xr is None and ctx.get('rk_ratio'):
        xr = ctx['rk_ratio'] * W
    elif xr is not None:
        ctx['rk_ratio'] = xr / W
    out['info']['xr'] = None if xr is None else round(xr)
    B1 = (xr - 0.016 * W) if xr is not None else (xd - 0.098 * W)       # left edge of the rank cell (the name cell ends before it)
    out['info']['B1'] = round(B1)
    out['info']['W_'] = W
    # the rule between the name column and the rank column prints marks ("I", "l", "!", "j", ":") at one x on every line of the page
    rx = []
    for l in lines:
        if any(T.is_month(w['w']) and abs(w['x0'] - xd) <= 0.03 * W for w in l):
            for w in l:
                if B1 - 0.04 * W <= w['x0'] < B2 and (not T.core(w['w']) or T.core(w['w']) in ('I', 'i', 'l', 'L', '1', 'j', 'J')):
                    rx.append(w['x0'])
    xrule = G.peak(rx, width=max(12, 0.007 * W), minn=5)[0] if rx else None
    out['info']['xrule'] = None if xrule is None else round(xrule)
    hs = [line_height(l) for l in lines if any(T.is_month(w['w']) and abs(w['x0'] - xd) <= 0.03 * W for w in l)]
    hmed = statistics.median(hs) if hs else None
    out['info']['hrow'] = None if hmed is None else round(hmed)
    # --- classify the lines top to bottom
    pitch = None
    ys = [statistics.mean(w['yk'] for w in l) for l in lines]
    note_from = None
    month_ys = [ys[i] for i, l in enumerate(lines) if any(T.is_month(w['w']) and abs(w['x0'] - xd) <= 0.03 * W for w in l)]
    y_first_month = min(month_ys) if month_ys else 0
    dd = [b - a for a, b in zip(month_ys, month_ys[1:]) if 0 < b - a < 120]
    pitch0 = statistics.median(dd) if dd else None
    last_row = None            # the row dict that a continuation line may join
    last_y = None
    row_ys = []
    for i, l in enumerate(lines):
        toks = tok_text(l)
        txt = line_txt(l)
        y = ys[i]
        x0, x1 = l[0]['x0'], l[-1]['x1']
        has_month = any(T.is_month(w['w']) and abs(w['x0'] - xd) <= 0.03 * W for w in l)
        left = [w for w in l if w['x0'] < B2]
        right = [w for w in l if w['x0'] >= B2]
        left_alnum = [w for w in left if len(T.core(w['w'])) >= 2 or (len(T.core(w['w'])) == 1 and T.core(w['w']).isupper() and T.core(w['w']) not in 'ILJ')]
        h = line_height(l)
        # --- the note on the abbreviations and everything under it
        if note_from is not None or (NOTE_RE.search(txt) and not has_month and x0 < xd):
            if note_from is None:
                note_from = y
            out['items'].append(('skip', 'note', txt, y))
            last_row = None
            continue
        if has_month:
            hd = None
        else:
            hd = heading_of(toks)
            if hd and hd[0] == 'company' and (x0 < (xn if xn is not None else 0.12 * W) + 0.04 * W and len(toks) > 3):
                hd = None     # a name that begins like a heading word ("Compton, James H")
        if not has_month and not hd and (i < 3 or y < y_first_month - 2.2 * (pitch0 or 40)) and not any(
                B1 <= w['x0'] < B2 and (T.is_ditto(w['w']) or T.rank_like(w['w'])) for w in l):
            out['items'].append(('skip', 'head', txt, y))
            continue
        if not has_month and not hd and (is_header_line(toks) or is_service_line(toks) or is_regiment_head(toks)) and i < 4:
            out['items'].append(('skip', 'head', txt, y))
            continue
        if not has_month and is_header_line(toks) and len(toks) <= 12:
            out['items'].append(('skip', 'header', txt, y))
            last_row = None
            continue
        if hd:
            out['items'].append(('heading', hd[0], hd[1], txt, y))
            last_row = None
            continue
        if not has_month and RECRUIT_RE.match(re.sub(r'^[^A-Za-z]+', '', toks[0])) and (xn is None or x0 > xn + 0.04 * W) and (x0 < B2 or last_row is None) and len(toks) >= 2:
            out['items'].append(('skip', 'recruited', txt, y))
            prev_items = [it for it in out['items'][:-1] if it[0] in ('heading', 'row', 'skip', 'orphan')]
            near_heading = any(it[0] == 'heading' and y - it[-1] < 4.2 * (pitch0 or 40) for it in out['items'][-3:-1])
            if not near_heading and x0 > (xn if xn is not None else 0) + 0.12 * W:
                # the line that says where the company was recruited stands without the heading above it: the heading was lost by the text layer
                out['items'].insert(len(out['items']) - 1, ('heading', 'company', '?', '(inferred from the recruited line) ' + txt, y - 1))
            last_row = None
            continue
        # a line of running prose (a narrative page ends above the roll, a footnote under the table): many words, no cell gaps, starts in the name column
        if not has_month and len(l) >= 6 and left_alnum and max(l[k + 1]['x0'] - l[k]['x1'] for k in range(len(l) - 1)) < 0.045 * W and not any(
                B1 <= w['x0'] < B2 and (T.is_ditto(w['w']) or T.rank_like(w['w'])) for w in l):
            out['items'].append(('skip', 'prose', txt, y))
            last_row = None
            continue
        if not has_month and not right and left_alnum and all(T.core(w['w']).isdigit() or T.core(w['w']).lower() in ('vol', 'il', 'ill', 'iii', 'ii', 'iv', 'v', 'i', 'l') for w in left_alnum):
            out['items'].append(('skip', 'foot', txt, y))        # the signature mark at the foot of a page ("104", "131 - VOL. III.")
            continue
        if not left_alnum and not has_month:
            # continuation line (wrapped remark) or a stray mark line
            if last_row is not None and (pitch is None or y - last_y <= 2.4 * pitch):
                last_row['cont_w'].extend(l)
                last_row['lines'] += 1
                last_y = y
                continue
            out['items'].append(('orphan', txt, y, 'text right of the name columns and no row above'))
            continue
        # --- an anchor line: a table line with a name, a rank or a date at the date column
        row = {'y': y, 'lines': 1, 'left_w': left, 'post_w': list(right), 'cont_w': [], 'flags': set(), 'h': h, 'line': i}
        out['items'].append(('row', row))
        if last_y is not None and y - last_y > 0:
            d = y - last_y
            if pitch is None or d < pitch * 1.6:
                pitch = d if pitch is None else 0.8 * pitch + 0.2 * d
        last_row, last_y = row, y
    out['info']['pitch'] = None if pitch is None else round(pitch, 1)
    return out
