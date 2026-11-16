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


_HEAD_FUZZ = ['name', 'rank', 'date', 'muster', 'into', 'service', 'remarks', 'term', 'years', 'enlistment']
_RUN_FUZZ = ['regiment', 'pennsylvania', 'volunteers', 'hundred', 'infantry', 'cavalry', 'artillery', 'battery', 'independent', 'reserve', 'heavy', 'militia', 'emergency']


def _fuzzy_hit(k, words, ratio=0.45):
    """The word k is within a few letters of one of the printed words (the text layer damages the heads of the pages more than the lines)."""
    n = len(k)
    if n < 3:
        return False
    for h in words:
        if abs(len(h) - n) > 3:
            continue
        d = T.lev(k, h, 3)
        if d <= 3 and d / max(n, len(h)) <= ratio:
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
    if hits >= 1 and hits + small >= 0.7 * len(ks):
        return True
    fz = sum(1 for k in ks if _fuzzy_hit(k, _HEAD_FUZZ))
    return fz >= 3 and fz + small >= 0.75 * len(ks)


_FOOT_RE = re.compile(r'^(?P<pre>[0-9A-Za-z]{1,4})[VvYyWTt]?[OoQ0Uu][LlIi1EeFfKkrR|!][IilLUuHhVvYyTtNn1|]{0,5}[a-z]?$')


def is_foot_line(toks, i, n):
    """The signature mark at the foot of a page ("84 - VOL. III."), damaged or intact: a number, VOL, a roman numeral, nothing else; or what is left of it
    (a number alone, a few short tokens with a digit) on one of the last lines of the page."""
    if len(toks) > 5 or any(T.is_month_loose(t) for t in toks) or any(T.is_ditto(t) for t in toks):
        return False
    cores = [T.core(t) for t in toks if T.core(t)]
    if not cores:
        return False
    k = ''.join(cores)
    m = _FOOT_RE.match(k)
    if m and (any(c.isdigit() for c in m.group('pre')) or i >= n - 4):
        return True
    if i >= n - 4 and len(cores) == 1 and len(cores[0]) <= 4 and any(c.isdigit() for c in cores[0]) and not any(c.islower() for c in cores[0]):
        return True                       # the page number or the signature number alone ("85", "4G")
    if i >= n - 4 and len(toks) <= 4 and all(len(c) <= 5 for c in cores) and any(c.isdigit() for c in k) and re.search(r'[OQ0U][LlIiEeFfK1|!]', k) and sum(c.isalpha() for c in k) <= 7:
        return True                       # "81 - OL 1V", "69 - TOL. n."
    if i >= n - 2 and len(toks) <= 4 and all(len(c) <= 5 for c in cores) and any(c.isdigit() for c in k) and sum(c.isalpha() for c in k) <= 6:
        return True                       # what remains of a signature mark on the last lines of the page
    return False


_FOOTNOTE_MARK = re.compile(r'^[*\u2020\u2021\u00a7^|]+$|^[tfjJ]$|^[*\u2020\u2021\u00a7^]+[A-Z][a-z]+$')


def is_footnote_line(toks):
    """A footnote under the table ("* There are no muster-out rolls of this company on file ..."; the dagger is often read as t, ^ or |)."""
    if len(toks) < 4:
        return False
    if not _FOOTNOTE_MARK.match(toks[0]):
        return False
    nxt = toks[1] if len(toks[0]) == 1 or not T.core(toks[0]) else toks[0]
    return bool(re.match(r'^[^A-Za-z]*[A-Z][a-z]', nxt)) and not any(T.is_month_loose(t) for t in toks[:3])


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
    if len(toks) > 14 or any(T.is_month(t) for t in toks):
        return False
    if re.search(r'reg[il]?m[eb]|eeg[il]?m|keg[il]?m|regmen|regim|egime|reserve|cavalry|cavalhy|oavalry|artillery|aetillery|independ|inclepend', k):
        return True
    # the running head with the words damaged ("ONE HUNDRED AND EIGHTEENTH EEGniENT, PENNSYLVANIA VOLUNTEERS"): two words within a few letters of the printed ones
    return sum(1 for t in toks if _fuzzy_hit(_alpha(t), _RUN_FUZZ, 0.4)) >= 2


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
    # company / battery heading: the word "Company" (or Battery, Troop) may be split or damaged by the text layer ("Co MPAN T B .", "Co ]& PANT H.")
    if not (len(toks) <= 8 and toks[0][:1] in ('C', 'B', 'c', 'b') and (toks[0][:1].isupper() or toks[0][:2].isupper())):
        return None
    if any(T.is_month(t) for t in toks):
        return None
    best = None
    acc = ''
    for k in range(1, min(len(toks), 5) + 1):
        acc += re.sub(r'[^A-Za-z0-9]', '', toks[k - 1])
        al = acc.lower()
        if len(al) < 5:
            continue
        for word in ('company', 'battery'):
            if al[0] != word[0]:
                continue
            d = T.lev(al, word, 3)
            if k == 1 and len(al) >= 8:
                d = min(d, T.lev(al[:7], word, 3))
            if (d <= 1) or (d <= 2 and len(al) >= 6):
                if best is None or d < best[0] or (d == best[0] == 1 and k > best[1]):
                    best = (d, k, word)
        if len(al) > 9:
            break
    if best is None and len(toks) >= 1 and re.sub(r'[^A-Za-z0-9]', '', toks[0]).lower() == 'troop':
        best = (0, 1, 'troop')
    if best is None:
        return None
    k = best[1]
    rest = toks[k:]
    if not rest:
        return ('company?', '?')
    t1 = re.sub(r'[^A-Za-z0-9]', '', rest[0])
    after = rest[1:]
    # after the letter: nothing, or the place of recruitment ("recruited at ..."), or marks; a remark ("company H - date unknown") is no heading
    after_w = [t for t in after if re.sub(r'[^A-Za-z0-9]', '', t)]
    ok_after = (not after_w) or bool(RECRUIT_RE.match(re.sub(r'^[^A-Za-z]+', '', after_w[0])))
    if (len(t1) == 1 or (len(t1) == 2 and t1[0] == t1[1])) and ok_after:
        wf = bool(re.fullmatch(r"[A-Z][.,]?\*?", rest[0].strip())) and len(t1) == 1 and best[0] <= 1
        return ('company' if wf else 'company?', t1[0].upper())
    if t1 == '' and ok_after:
        return ('company?', '?')
    if RECRUIT_RE.match(t1):
        return ('company?', '?')                      # the letter is not there: "COMPANT^. RECRUITED AT ..."
    return None


def build_lines(ws):
    tilt = G.estimate_tilt(ws)
    return tilt, G.cluster_lines(ws, tilt)


# ------------------------------------------------------------------------------------------------------------------ the leaf

NOTE_RE = re.compile(r'following\s+abbrev|abbreviat|prepara?tion\s+of\s+rem|used\s+in\s+the\s+prep', re.I)
RECRUIT_RE = re.compile(r'^(?:rec|bec|kec|reo|rec\^|kooruit|keor|eeor|recr|recruit|raised|organi[sz]ed|enrolled|mustered|recruitl)', re.I)
MARKS = re.compile(r"^[^A-Za-z0-9]*$")


def is_recruit_tok(tok):
    """The first word of a "RECRUITED AT ..." line, damaged or intact."""
    t = re.sub(r'^[^A-Za-z]+', '', tok)
    if RECRUIT_RE.match(t):
        return True
    a = re.sub(r'[^a-z]', '', t.lower())
    return len(a) >= 7 and T.lev(a, 'recruited', 3) <= 3
_DATEISH = re.compile(r"^[.,'‘’`\"]*\d{1,4}[.,;:]*$")
# the first word of a remark that stands alone on a line whose name, rank and date cells the text layer lost
REMARK_START = re.compile(r'^(?:died|disch|dis\b|dism|not\b|must|mus\b|kill|wound|wd\b|capt|cap\b|absen|abs\b|trans|tr\b|deser|promo|pr\b|resign|draft|missing|mis\b|drop|subst|vet\b|taken|appoint|commiss|honor|prison|parol|sick|never|supp|unknown|exch|retir|cashier|expir|detail|re-?enl|reenl)', re.I)
_ABBR_END = re.compile(r'(?:^|[^A-Za-z])[A-Za-z]\.$|(?:Co|Cav|Res|Reg|Pa|Va|Md|Del|Cor|Sgt|Lt|Capt|Gen|Col|No|St|Jr|Sr|Wm|Jas|Geo|Chas|Thos|Hosp|Art|Batt|Dept|Cem|Gov|Adj|Maj|Sept|Aug|Oct|Nov|Dec|Jan|Feb|Mar|Apr)\.$')


def _remark_start(tok):
    t = re.sub(r'^[^A-Za-z]+', '', tok)
    return bool(t) and t[0].isupper() and bool(REMARK_START.match(t))


def _ends_sentence(row):
    """The remark above ends with a full stop that closes a sentence (not an abbreviation or an initial at the end of a wrapped line)."""
    ws = row['cont_w'] or row['post_w']
    for w in reversed(ws):
        t = w['w'].rstrip('"\'\u201d\u2019)]')
        if T.core(t):
            return t.endswith('.') and not _ABBR_END.search(t)
    return False


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
    if not mw and len(ws) < 40:
        out['info']['kind'] = 'narrative'      # a leaf with a few words and no date at all (a blank or half-blank scan): no table
        return out
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
    # the left edge of the remark column: the first remark word of the dated lines (after the date and the term digit)
    rem0 = []
    for l in lines:
        if any(T.is_month(w['w']) and abs(w['x0'] - xd) <= 0.03 * W for w in l):
            for w in l:
                if w['x0'] >= xd + 0.095 * W and len(T.core(w['w'])) >= 2 and not T.is_month(w['w']) and not _DATEISH.match(w['w']):
                    rem0.append(w['x0'])
                    break
    xrem = statistics.median(rem0) if len(rem0) >= 5 else None
    out['info']['xrem'] = None if xrem is None else round(xrem)
    # --- classify the lines top to bottom
    pitch = None
    ys = [statistics.mean(w['yk'] for w in l) for l in lines]
    note_from = None
    footnote_from = None
    month_ys = [ys[i] for i, l in enumerate(lines) if any(T.is_month(w['w']) and abs(w['x0'] - xd) <= 0.03 * W for w in l)]
    y_first_month = min(month_ys) if month_ys else 0
    dd = [b - a for a, b in zip(month_ys, month_ys[1:]) if 0 < b - a < 120]
    pitch0 = statistics.median(dd) if dd else None
    last_row = None            # the row dict that a continuation line may join
    last_y = None
    row_ys = []
    pre_roll = not ctx.get('seen_heading') and ctx.get('dated_rows', 0) < 3     # nothing of the roll has been seen yet in this unit: the page may begin with narrative
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
        if footnote_from is not None or (not has_month and i > 0 and is_footnote_line(toks) and not any(
                B1 <= w['x0'] < B2 and (T.is_ditto(w['w']) or T.rank_like(w['w'])) for w in l)):
            if footnote_from is None:
                footnote_from = y
            out['items'].append(('skip', 'footnote', txt, y))      # a footnote under the table and everything below it (the signature mark)
            last_row = None
            continue
        if not has_month and is_foot_line(toks, i, len(lines)):
            out['items'].append(('skip', 'foot', txt, y))
            last_row = None
            continue
        if has_month:
            hd = None
        else:
            hd = heading_of(toks)
            if hd and hd[0].startswith('company') and (x0 < (xn if xn is not None else 0.12 * W) + 0.04 * W and len(toks) > 3):
                hd = None     # a name that begins like a heading word ("Compton, James H")
        right_alnum = [w for w in right if T.core(w['w'])]
        far_above = y < y_first_month - 2.2 * (pitch0 or 40)
        is_recruit = is_recruit_tok(toks[0]) and len(toks) >= 2
        recognised = is_header_line(toks) or is_service_line(toks) or is_regiment_head(toks)
        if not has_month and not hd and (i < 3 or far_above) and not any(
                B1 <= w['x0'] < B2 and (T.is_ditto(w['w']) or T.rank_like(w['w'])) for w in l) and (
                not right_alnum or (far_above and not is_recruit) or recognised):
            # the running head, the page number, the column headings (a table line has cells right of the name); a line that no head pattern recognises
            # and that is skipped only for its place above the first dated line is kept in the list of skipped lines as head-far
            out['items'].append(('skip', 'head' if (recognised or not T.core(txt)) else 'head-far', txt, y))
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
            ctx['seen_heading'] = True
            last_row = None
            continue
        if not has_month and is_recruit_tok(toks[0]) and (xn is None or x0 > xn + 0.04 * W or (
                len(toks) >= 3 and re.match(r'^(?:[Aa][TtIiRr]?|[Ii][Nn]|[Ff][Rr][Oo][Mm])[.,]?$', toks[1]) and toks[0][:1].isupper())) and (x0 < B2 or last_row is None) and len(toks) >= 2:
            out['items'].append(('skip', 'recruited', txt, y))
            prev_items = [it for it in out['items'][:-1] if it[0] in ('heading', 'row', 'skip', 'orphan')]
            near_heading = any(it[0] == 'heading' and y - it[-1] < 4.2 * (pitch0 or 40) for it in out['items'][-3:-1])
            if not near_heading and x0 > (xn if xn is not None else 0) + 0.12 * W:
                # the line that says where the company was recruited stands without the heading above it: the heading was lost by the text layer
                out['items'].insert(len(out['items']) - 1, ('heading', 'company?', '?', '(inferred from the recruited line) ' + txt, y - 1))
            last_row = None
            continue
        # a line of running prose (a narrative page ends above the roll, a footnote under the table): words stand in the rank and date columns where a
        # table line has a rank word, a month or nothing at all
        if pre_roll and not has_month and len(l) >= 3 and toks[0][:1].islower() and len(T.core(toks[0])) >= 3 and not any(
                B1 <= w['x0'] < B2 and (T.is_ditto(w['w']) or T.rank_like(w['w'])) for w in l):
            out['items'].append(('skip', 'prose', txt, y))      # the end of a sentence of the narrative above the roll ("office of the State.")
            last_row = None
            continue
        if pre_roll and not has_month and len(l) >= 6 and left_alnum:
            mid = [w for w in l if B1 - 0.02 * W <= w['x0'] < xd + 0.12 * W and len(T.core(w['w'])) >= 3 and sum(c.isalpha() for c in w['w']) >= 3]
            if len(mid) >= 2 and not any(B1 <= w['x0'] < B2 and (T.is_ditto(w['w']) or T.rank_like(w['w'])) for w in l):
                out['items'].append(('skip', 'prose', txt, y))
                last_row = None
                continue
        if not has_month and not right and left_alnum and all(T.core(w['w']).isdigit() or T.core(w['w']).lower() in ('vol', 'il', 'ill', 'iii', 'ii', 'iv', 'v', 'i', 'l') for w in left_alnum):
            out['items'].append(('skip', 'foot', txt, y))        # the signature mark at the foot of a page ("104", "131 - VOL. III.")
            continue
        if not left_alnum and not has_month:
            if xrem is not None and len(toks) >= 2 and abs(l[0]['x0'] - xrem) <= 0.008 * W and _remark_start(toks[0]) and (last_row is None or _ends_sentence(last_row)):
                # a remark that begins at the left edge of the remark column, under a remark that is complete: a printed line whose name, rank and date
                # cells the text layer lost (a wrapped remark would stand indented, and under an unfinished remark)
                row = {'y': y, 'lines': 1, 'left_w': [], 'post_w': list(l), 'cont_w': [], 'flags': set(), 'h': h, 'line': i, 'dated': False}
                out['items'].append(('row', row))
                if last_y is not None and y - last_y > 0:
                    d = y - last_y
                    if pitch is None or d < pitch * 1.6:
                        pitch = d if pitch is None else 0.8 * pitch + 0.2 * d
                last_row, last_y = row, y
                continue
            # continuation line (wrapped remark) or a stray mark line
            if last_row is not None and (pitch is None or y - last_y <= 2.4 * pitch):
                last_row['cont_w'].extend(l)
                last_row['lines'] += 1
                last_y = y
                continue
            out['items'].append(('orphan', txt, y, 'text right of the name columns and no row above'))
            continue
        # --- an anchor line: a table line with a name, a rank or a date at the date column
        row = {'y': y, 'lines': 1, 'left_w': left, 'post_w': list(right), 'cont_w': [], 'flags': set(), 'h': h, 'line': i, 'dated': has_month}
        out['items'].append(('row', row))
        if last_y is not None and y - last_y > 0:
            d = y - last_y
            if pitch is None or d < pitch * 1.6:
                pitch = d if pitch is None else 0.8 * pitch + 0.2 * d
        last_row, last_y = row, y
    # a roll page that begins with the end of the regiment's narrative: lines without a date that stand next to prose lines are prose too
    items = out['items']
    first_hd = next((k for k, it in enumerate(items) if it[0] == 'heading'), len(items))
    ctx['dated_rows'] = ctx.get('dated_rows', 0) + sum(1 for it in items if it[0] == 'row' and it[1]['dated'])
    changed = pre_roll
    while changed:
        changed = False
        for k, it in enumerate(items):
            if k >= first_hd:
                break
            if it[0] == 'row' and not it[1]['dated'] and not any(T.is_ditto(w['w']) for w in it[1]['left_w']):
                prev = items[k - 1] if k > 0 else None
                nxt = items[k + 1] if k + 1 < len(items) else None
                if (prev and prev[0] == 'skip' and prev[1] in ('prose', 'head')) or (nxt and nxt[0] == 'skip' and nxt[1] in ('prose',)):
                    items[k] = ('skip', 'prose', ' '.join(w['w'] for w in it[1]['left_w'] + it[1]['post_w'] + it[1]['cont_w']), it[1]['y'])
                    changed = True
    out['info']['pitch'] = None if pitch is None else round(pitch, 1)
    return out
