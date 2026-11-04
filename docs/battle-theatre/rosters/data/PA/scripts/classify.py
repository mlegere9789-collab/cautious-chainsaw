"""Classify Bates roster records into presence labels (PLAN section 2.2 rules; the roll has no June 1863 muster status).
classify(rec, ctx) -> dict.  Rules, first that fires:
  CAS-REMARK      casualty/capture/death verb with Gettysburg named in the same remark segment (or dated 1-3 July 1863)
  DIED-AT-GETTYSBURG  died at Gettysburg, July 1863 (place, not the battle): Present-Documented, flagged
  SEP-BEFORE      separation event dated before 1 July 1863 (not an intra-regiment transfer)       -> Absent-Documented
  ENL-AFTER       muster date after 3 July 1863                                                    -> Absent-Documented
  CONFLICT        Gettysburg casualty AND separation before: Unknown, flag contested
  ONROLL-NO-STATUS  muster date before the battle, no separation before it                         -> Unknown / on-roll-undetermined
  OCR-DATE-LOST   muster date or a separation date not legible                                    -> Unknown / unreadable-or-ambiguous
"""
import re, datetime
import dates as D

OFFICER = re.compile(r'^\W*(col|lt\.?\s*col|lieut\.?\s*col|maj|capt|1st\s*l|2d\s*l|2nd\s*l|lieut|lt\b|adj|surg|asst|chap|q\.?\s*m|r\.?\s*q|com\.?\s*sgt|serg\.?\s*maj|sgt\.?\s*maj|hosp|quartermaster|1st lieut|2d lieut)', re.I)
SEPV = {'disch', 'died', 'killed', 'desert', 'trans', 'resign', 'dismiss'}
CASV = {'wd', 'killed', 'capt', 'missing', 'died'}
# AUDIT R2: a full stop after a year digit followed by a capitalised word starts a new sentence (two remarks of neighbouring lines were being read as one clause)
SEGSPLIT = re.compile(r'\s*(?:—|--|–|―|~)\s*|\s*;\s*|\s+-\s+|(?<=[0-9]{2}[0-9SGlO])\.\s+(?=[A-Z][a-z]{3})')


def clean_name(n):
    # AUDIT R8: rank text ('...do'), table rules ('|', '!') and the running head ('83- VOL', page number) glued to the name by the layout are cut off
    n = re.sub(r"\s+\d{1,4}\s*[—–\-]+\s*[VvYy][Oo0][Ll1I]\b.*$", '', n.strip())
    n = re.sub(r"[\s\.\|!:;,'`^_\-]*(?<![A-Za-z])d[o0]\b.*$", '', n)
    n = re.sub(r"[\s\.]{2,}\d{2,4}$", '', n)
    n = re.sub(r"\s\d{3}$", '', n)
    n = re.sub(r"\.{2,}[A-Za-z!|]$", '', n)
    n = re.sub(r"(?<=[a-z])\.[A-Za-z]'$", '', n)
    n = re.sub(r"(?<=[a-z]{5})\.[A-Z]$", '', n)
    n = re.sub(r"[\.\s]*[\|!^]+[\.\s]*$", '', n)
    n = re.sub(r'[\.…·_\s]{2,}$', '', n.strip())
    n = re.sub(r'(?:\s*[\.,·_]+\s*)+$', '', n)
    n = re.sub(r'\s+', ' ', n).strip(' .,_')
    return n


def split_segments(rem):
    segs = [s.strip(' .,;') for s in SEGSPLIT.split(rem) if s and s.strip(' .,;')]
    # a comma-continued event list like "Wounded at X, Y and Z" stays one segment; "Disch. ..., wd. at" also.
    out = []
    for s in segs:
        out.append(s)
    return out


def intra_transfer(seg, n):
    """Tr. to company K / Co. C, 26th reg. -> same regiment"""
    if not re.search(r'(\bco\b|\bco\.|\bcomp[a-z\.]{2,7}|company|\bcorn\s*pany)', seg, re.I):
        return False
    m = re.search(r'(\d{1,3})\s*(?:st|d|nd|rd|th|tb|tli)\b\.?\s*(?:reg|P\.?\s*V)', seg, re.I)
    if m:
        return int(m.group(1)) == n or (int(m.group(1)) in (n,))
    if re.search(r'u\.?\s*s\.?|vet|battery|artillery|cavalry|signal|navy|marine|reserve corps|v\.?\s*r\.?\s*c', seg, re.I):
        return False
    return True


def has_month_word(seg):
    """a month word read at all, OCR damage tolerated ('Sent', 'Fob', 'Julv', 'J ulv')"""
    import difflib
    t = re.sub(r"(?:(?<=\s)|^)([A-Z]) (?=[a-z]{2,})", r"\1", seg)      # 'J ulv' -> 'Julv'
    for w in re.findall(r'[A-Za-z]{3,}', t):
        wl = w.lower()
        if D.month_of(w):
            return True
        for m in D.MONTHS:
            if difflib.SequenceMatcher(None, wl, m).ratio() >= 0.6 or difflib.SequenceMatcher(None, wl, m[:4]).ratio() >= 0.74 or (len(wl) == 3 and difflib.SequenceMatcher(None, wl, m[:3]).ratio() >= 0.66):
                return True
    return False


def other_place(seg):
    """True when the clause names 'at/near <place>' and the place does not read as Gettysburg (OCR tolerant)"""
    import difflib
    for m in re.finditer(r"\b(?:at|near|in)\s+([^\s,]{4,})", seg, re.I):
        w = re.sub(r'[^a-z]', '', m.group(1).lower())
        if len(w) < 4 or w in ('action', 'hospital', 'battle', 'general', 'prison', 'muster', 'regiment', 'company', 'camp'):
            continue
        if difflib.SequenceMatcher(None, w, 'gettysburg').ratio() < 0.55:
            return True
    return False


def classify(rec, n, reg_label='', infer=None, corrob=None, mo_modal=None):
    rem = re.sub(r'\s+', ' ', rec['rem']).strip()
    rem = re.sub(r'([A-Za-z])-\s+([a-z])', lambda m: m.group(1) + m.group(2), rem)
    name = clean_name(rec['name'])
    flags = []
    # ---- muster date (strip the term-of-service digit '3' / '1' / '9' printed in its own column)
    dtxt = rec['date']
    dtxt2 = re.sub(r"^(?:\d\s+)", '', dtxt.strip())
    dtxt2 = re.sub(r"(?:\s+\d)$", '', dtxt2)
    md = [x for x in D.find_dates(dtxt2) if x[0]]
    if not md:
        md = [x for x in D.find_dates(dtxt) if x[0]]
    mdate = md[0][0] if md else None
    # AUDIT R3: two month-day tokens in the date column where the first has no year ('Sept. 21, Feb. 10, 64'): the second belongs to the next line; the date is not read
    _all = D.find_dates(dtxt2)
    if mdate is not None and len(_all) >= 2 and _all[0][0] is None and _all[0][1] == 'day-no-year':
        mdate = None
        md = []
        flags.append('muster-date-two-dates-in-cell')
    if mdate and mdate.year < 1861 or (mdate and mdate.year == 1861 and mdate.month < 4):
        flags.append('muster-date-implausible-ocr')
        mdate = None
    ocr_used = False
    xml_prec = md[0][1] if md else None
    if (mdate is None or xml_prec == 'month') and rec.get('date_ocr'):
        od = [x for x in D.find_dates(rec['date_ocr'][:34]) if x[0]]
        if od and not (od[0][0].year == 1861 and od[0][0].month < 4):
            if mdate is None or (od[0][1] == 'day' and (od[0][0].year, od[0][0].month) == (mdate.year, mdate.month)):
                mdate = od[0][0]
                ocr_used = True
    mdate_inf = None
    if mdate is None and infer is not None:
        nd = [x for x in D.find_dates(dtxt2) if x[1] == 'day-no-year']
        if nd:
            y = infer.get((nd[0][5], nd[0][6]))
            if y:
                try:
                    mdate_inf = datetime.date(y, nd[0][5], min(nd[0][6], 28 if nd[0][5] == 2 else 30 if nd[0][5] in (4, 6, 9, 11) else 31))
                except ValueError:
                    mdate_inf = None
    rank = rec['rank']
    # ---- segments and events
    segs = split_segments(rem)
    events = []
    for seg in segs:
        v = D.verb_of(seg)
        if not v:
            continue
        ds = D.find_dates(seg)
        full = [x[0] for x in ds if x[0]]
        d0 = full[0] if full else None
        gett = D.has_gettysburg(seg)
        events.append(dict(v=v, seg=seg, date=d0, gett=gett, prec=ds[0][1] if ds else None, dates=full))
    # ---- verbs that mean separation
    sep_before = None
    sep_unknown = None
    cas_g = None
    burial_g = None
    died_at_g = None
    intra = False
    cas_dated = None
    for e in events:
        v = e['v']
        seg = e['seg']
        if v == 'trans' and intra_transfer(seg, n):
            e['intra'] = True
            intra = True
            continue
        if v == 'prom':
            continue
        if v == 'mo':
            # muster out dated before the battle (nine-month and short-term service) is a separation; later dates say nothing
            if e['date'] is not None and e['date'] < D.GB_START and re.search(r'out|ex[pa]', seg, re.I):
                if mo_modal and (e['date'].month, e['date'].day) in mo_modal and e['date'].year < 1864:
                    # AUDIT R1: same month and day as the unit's own muster-out with company in 1864 or 1865: the year digit was misread; not a separation
                    flags.append('mo-year-conflict')
                    sep_unknown = sep_unknown or e
                else:
                    sep_before = sep_before or e
            continue
        # AUDIT R6: the date inside 1-3 July 1863 must be the FIRST date of the clause and the place, if named, must read as Gettysburg
        # (a muster-out 'July 1, 1863' misread for 1865, a Malvern Hill 'July 1' and a Hanover skirmish were labelled Present-Documented)
        if v in ('wd', 'killed', 'capt', 'missing') and not e['gett'] and e['dates'] and D.GB_START <= e['dates'][0] <= D.GB_END and not other_place(seg):
            cas_dated = cas_dated or e
        if v in SEPV and not (v in ('wd',)):
            if e['date'] is not None:
                if e['date'] < D.GB_START and not (v == 'killed' and e['gett']):
                    sep_before = sep_before or e
            elif re.search(r'date\s*unknown|no\s*date|unknown', seg, re.I) or not e['dates']:
                if v in ('disch', 'desert', 'died', 'trans', 'resign', 'dismiss', 'killed'):
                    yrs = [y for y in (D.year_of(tk) for tk in seg.split()) if y]
                    if yrs and max(yrs) <= 1862 and not re.search(r'date\s*unknown', seg, re.I):
                        # AUDIT R10: a year-only separation is not accepted when the clause carries another number and no month word (a stray '25,' marks a clause
                        # interleaved with the neighbouring line: 'Transferred Corps, 25, on certificate 1862' was Nov. 25, 1863 on the page)
                        if len(re.findall(r'\d+', seg)) > 1 and not has_month_word(seg):
                            flags.append('separation-clause-interleaved')
                            sep_unknown = sep_unknown or e
                        else:
                            e = dict(e, date=datetime.date(max(yrs), 12, 31), prec='year')
                            sep_before = sep_before or e
                    elif yrs and min(yrs) >= 1864:
                        pass      # the year alone puts the event after the battle
                    else:
                        sep_unknown = sep_unknown or e
    # ---- "Prisoner from July 1, to Sept. 28, '63": captured on a day of the battle (year taken from the release date)
    if cas_dated is None:
        for pm in re.finditer(r'(?:prisoner|pris\.?|captured)\s*(?:from\s*)?(?:july|julv|tuly)\s*([123])\b[^—;]{0,40}', rem, re.I):
            tail = pm.group(0)
            yrs = [y for y in (D.year_of(tk) for tk in tail.replace(',', ' ').split()) if y]
            yrs2 = []
            for tk in tail.replace(',', ' ').split():
                if re.fullmatch(r"['’`]?0[3]\.?", tk):
                    yrs2.append(1863)      # '03 for '63
            if (yrs and 1863 in yrs) or yrs2:
                cas_dated = dict(v='capt', seg=tail.strip(), date=datetime.date(1863, 7, int(pm.group(1))))
                break
    # ---- Gettysburg named anywhere in the remark: look at the words around each mention
    died_at_g = None
    burial_g = None
    bounds = [0] + [m.end() for m in SEGSPLIT.finditer(rem)] + [len(rem) + 1]
    for (gs, ge) in D.gett_positions(rem):
        k = max(i for i, b in enumerate(bounds[:-1]) if b <= gs)
        s0 = bounds[k]
        s1 = bounds[k + 1] - 1 if k + 1 < len(bounds) else len(rem)
        win = rem[s0:s1]
        before = rem[s0:gs]
        if re.search(r'\bnot\b', before[-25:], re.I):
            continue
        if D.has_kw(win, ['wound', 'kill', 'capt']) or re.search(r'loss\s+of', win, re.I):
            cas_g = cas_g or dict(v='wd', seg=win.strip(), date=None)
        elif D.has_kw(win, ['bur']) or re.search(r'nat\w*\.?\s*cem', win, re.I):
            burial_g = burial_g or dict(v='bu', seg=win.strip(), date=None)
        elif re.search(r'\bdied\b|\bdicd\b', before[-60:], re.I):
            ds = [x for x in D.find_dates(win) if x[0]]
            if ds and datetime.date(1863, 7, 1) <= ds[0][0] <= datetime.date(1863, 7, 31):
                died_at_g = dict(v='died', seg=win.strip(), date=ds[0][0])
            else:
                flags.append('gettysburg-mention-nonbattle')
        else:
            flags.append('gettysburg-mention-nonbattle')
    # ---- labels
    why = ''
    code = ''
    label = 'Unknown'
    roll = 'on-roll-undetermined'
    if cas_g and sep_before:
        label, roll, code = 'Unknown', 'on-roll-undetermined', 'CONFLICT'
        why = 'remark names a Gettysburg casualty but also a separation dated %s: %s' % (sep_before['date'], rem[:120])
        flags.append('contested')
    elif cas_g:
        label, roll, code = 'Present-Documented', 'named-present', 'CAS-REMARK'
        why = 'Bates remark names Gettysburg: ' + cas_g['seg'][:110]
    elif burial_g and not sep_before:
        label, roll, code = 'Present-Documented', 'named-present', 'BURIAL'
        why = 'Bates remark records burial at Gettysburg (Soldiers National Cemetery): ' + burial_g['seg'][:110]
    elif cas_dated and not sep_before:
        label, roll, code = 'Present-Documented', 'named-present', 'CAS-REMARK-DATE'
        why = 'casualty event dated 1-3 July 1863 (place not named as Gettysburg): ' + cas_dated['seg'][:100]
        flags.append('place-not-named')
    elif died_at_g and not sep_before:
        label, roll, code = 'Present-Documented', 'named-present', 'DIED-AT-GETTYSBURG'
        why = 'died at Gettysburg in July 1863 (place of the battlefield hospitals; the remark does not state a wound): ' + died_at_g['seg'][:100]
        flags.append('death-at-gettysburg-no-wound-stated')
    elif sep_before:
        label, roll, code = 'Absent-Documented', 'off-roll-before-battle', 'SEP-BEFORE'
        why = '%s dated %s (before 1 July 1863): %s' % (sep_before['v'], sep_before['date'], sep_before['seg'][:100])
    elif mdate and mdate >= datetime.date(1863, 7, 4) and ocr_used and xml_prec is None and (corrob is None or corrob.get(mdate, 0) < 3):
        # a date read only by the second OCR (measured 6 percent disagreement with the first OCR where both read): an Absent label needs
        # the same muster date read by the first OCR on at least 3 other rows of the unit
        label, roll, code = 'Unknown', 'unreadable-or-ambiguous', 'OCR-DATE-LOST'
        why = 'second-OCR muster date %s is after the battle but no other row of the unit reads that date in the first OCR (uncorroborated)' % mdate
        flags.append('second-ocr-date-uncorroborated')
    elif mdate and mdate >= datetime.date(1863, 7, 4):
        label, roll, code = 'Absent-Documented', 'not-yet-enlisted', 'ENL-AFTER'
        why = 'muster date %s is after the battle%s' % (mdate, ' (read by the second OCR of the page image; first OCR had no readable year)' if ocr_used else '')
    elif sep_unknown:
        label, roll, code = 'Unknown', 'unreadable-or-ambiguous', 'OCR-DATE-LOST'
        why = '%s event with no readable date (printed unknown or lost): %s' % (sep_unknown['v'], sep_unknown['seg'][:90])
    elif mdate is None and mdate_inf is not None and mdate_inf < datetime.date(1863, 7, 1):
        label, roll, code = 'Unknown', 'on-roll-undetermined', 'ONROLL-NO-STATUS'
        why = 'muster year not in the OCR layer; month and day match a regiment muster date whose year is read on other rows (%s): inferred muster %s (Modelled); no separation dated before 1 July 1863' % ('inferred', mdate_inf)
        flags.append('muster-year-inferred')
    elif mdate is None and not intra:
        label, roll, code = 'Unknown', 'unreadable-or-ambiguous', 'OCR-DATE-LOST'
        why = 'muster date not legible in the OCR layer; needs the page image'
    elif mdate is None and intra:
        label, roll, code = 'Unknown', 'on-roll-undetermined', 'ONROLL-NO-STATUS'
        why = 'intra-regiment transfer row; muster date not legible; see dup group'
    else:
        label, roll, code = 'Unknown', 'on-roll-undetermined', 'ONROLL-NO-STATUS'
        why = 'on the roll (mustered %s), no separation dated before 1 July 1863 in the remark; Bates gives no June 1863 muster status' % mdate
    # ---- parse flags
    if ocr_used:
        flags.append('muster-date-second-ocr')
    if not name:
        flags.append('name-missing')
    elif re.search(r'[^A-Za-z\.\,\'\-\sÀ-ÿ]', name) or len(name) < 4:
        flags.append('name-garbled')
    if not rec['date'].strip():
        flags.append('date-missing')
    if rec.get('nodate'):
        flags.append('no-month-in-date-column')
    if intra:
        flags.append('intra-regiment-transfer')
    ev = ';'.join('%s:%s' % (e['v'], e['date'].isoformat() if e['date'] else '') for e in events)
    return dict(name_clean=name, muster_date=mdate.isoformat() if mdate else '', events=ev, presence_label=label, roll_status=roll,
                basis_code=code, presence_basis=why, parse_flags=';'.join(flags), is_officer=bool(OFFICER.match(rank)))
