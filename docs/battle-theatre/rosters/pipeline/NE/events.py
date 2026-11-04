"""Event extraction + presence labelling for state-roster remark text (Massachusetts format and similar).
Rules: PLAN section 2.2, applied in order; first that fires sets the label."""
import re, datetime
from rosterlib import find_dates, classify_after_battle, GETT, GB_START, GB_END, year_only

OTHER_UNIT = re.compile(r"(Mass\.|N\. ?H\.|N\. ?Y\.|Me\.|Vt\.|Conn\.|R\. ?I\.|Inf\.|Cav\.|Arty\.|Art\.|V\. ?R\. ?C|Vet\. Res|Navy|Marine|U\. ?S\. ?A|U\. ?S\.|Regt|Regiment|Battery|Batty|Invalid|Signal|Engr|Hosp|Brig|Corps|Colored|Pioneer)", re.I)
INTRA_TO = re.compile(r"transf(?:erred)?\.?[^;]*?\bto\s+(?:Co\.?\s*)?[\"“”'‘’]*\s*([A-K])\s*[\"“”'‘’]*(?:\s|,|;|\.|$)", re.I)
RETURN_WORDS = re.compile(r"\b(returned|rejoined|restored|arrested|apprehended|surrendered|reported|joined|reinstated|revoked|dishonorable discharge revoked)", re.I)


def seg_kind(seg):
    s = re.sub(r'\s+', ' ', seg.strip()).lower().strip()
    s = re.sub(r'^and\s+', '', s)
    s = re.sub(r"^[\.,:\-\s]+", '', s)
    if re.match(r'(disch|discharged|disehg|dischg)', s):
        return 'disch'
    if re.match(r'(resign|res\b\.?\s*(and|,)|res\. and)', s):
        return 'resign'
    if re.match(r'(dismiss|cashier|dishonor|dropped|taken from|stricken)', s):
        return 'dismiss'
    if re.match(r'(deserted|desert|dest)', s):
        return 'deserted'
    if re.match(r'(died|dead|drowned)', s):
        return 'died'
    if re.match(r'(killed|k\. in a|shot|murdered)', s):
        return 'killed'
    if re.match(r'(must[\.,]? ?out|mustered out|must, out|must\. out)', s):
        return 'mustout'
    if re.match(r'(transf|transferred|trans\.)', s):
        if re.search(r'\bfrom\b', s[:60]) and not re.search(r'\bto\b', s[:25]):
            return 'transf_in'
        return 'transf_out'
    if re.match(r'(wounded|wd\.|severely wounded|slightly wounded)', s):
        return 'wounded'
    if re.match(r'(prisoner|captured|taken prisoner|missing|paroled|exchanged)', s):
        return 'prisoner'
    if re.match(r'(enl|enlist|volunteered)', s):
        return 'enl'
    if re.match(r'(comm|commissioned|appt|apptd|appointed|promoted|prom)', s):
        return 'comm'
    if re.match(r'(draft|drafted)', s):
        return 'draft'
    if re.match(r'(re-?enlist|reenlist|veteran)', s):
        return 'reenlist'
    if re.match(r'(must\b|mustered|must\.)', s):
        return 'must'
    if re.match(r'see\b', s):
        return 'see'
    return 'other'


def analyse(body):
    """body: remark text from after 'Res. X;' on. Returns dict of facts."""
    text = re.sub(r'\s+', ' ', body)
    # undo hyphenation of line breaks ("Wilder- ness")
    text = re.sub(r'(\w)- (\w)', r'\1\2', text)
    segs = [x.strip() for x in re.split(r';', text) if x.strip()]
    facts = dict(E=None, E_prec=None, E_raw=None, E_kind=None, sep=[], gett_cas=[], cas_in_window=[], events=[],
                 unreadable=[], intra_out=None, intra_in=False, other_from=None, wounded_1863_noplace=False,
                 returned_after_sep=False, nodate_sep=[], segs=segs)
    for k, seg in enumerate(segs):
        kind = seg_kind(seg)
        if kind == 'see':
            break_after = True
            continue
        dts = find_dates(seg)
        has_g = bool(GETT.search(seg))
        facts['events'].append((kind, seg, dts))
        if has_g:
            if kind in ('deserted', 'disch', 'resign', 'mustout', 'transf_out', 'dismiss') and dts and dts[0][0] < GB_START:
                facts.setdefault('gett_conflict', []).append((kind, seg))
            else:
                facts['gett_cas'].append((kind, seg))
        for d, prec, a, b, raw in dts:
            if kind in ('wounded', 'prisoner', 'killed') or (kind == 'died' and re.search(r'wound', seg, re.I)):
                pass
            else:
                continue
            if GB_START <= d <= GB_END and prec == 'day':
                facts['cas_in_window'].append((kind, d, seg))
        if kind == 'wounded' and not dts and re.search(r"1863|’63|'63", seg) and not has_g:
            facts['wounded_1863_noplace'] = True
        if kind == 'wounded' and re.search(r"\bin\s+1863\b", seg) and not has_g:
            facts['wounded_1863_noplace'] = True
        if kind in ('enl', 'comm', 'draft', 'must', 'transf_in') and facts['E'] is None:
            if kind == 'transf_in':
                if re.search(r'from\s+Co\.?\s*[\"“”\'‘’]*\s*[A-K]\b', seg) and not OTHER_UNIT.search(re.sub(r'from\s+Co\.?\s*["“”\'‘’]*\s*[A-K]["“”\'‘’]*', '', seg, flags=re.I).replace('transf.', '')):
                    facts['intra_in'] = True
                    continue
                facts['other_from'] = seg
            if dts:
                d, prec, a, b, raw = dts[0]
                facts['E'], facts['E_prec'], facts['E_raw'], facts['E_kind'] = d, prec, raw, kind
            else:
                yy = year_only(seg)
                if yy and not re.search(r'date not shown', seg, re.I):
                    facts['E'], facts['E_prec'], facts['E_raw'], facts['E_kind'] = datetime.date(yy[0], 1, 1), 'year', str(yy[0]) + ' (month unreadable)', kind
        if kind in ('disch', 'resign', 'dismiss', 'deserted', 'died', 'killed', 'mustout', 'transf_out'):
            if kind == 'transf_out':
                m = INTRA_TO.search(seg)
                rest = re.sub(r'transf(?:erred)?\.?', '', seg, flags=re.I)
                if m and not OTHER_UNIT.search(re.sub(r'(?:Co\.?\s*)?["“”\'‘’]*\s*[A-K]\s*["“”\'‘’]*', '', rest.split(' to ', 1)[-1])):
                    facts['intra_out'] = dts[0][0] if dts else True
                    continue
            if kind in ('killed', 'died') and has_g:
                continue
            if dts:
                d, prec, a, b, raw = dts[0]
                facts['sep'].append((kind, d, prec, seg))
            else:
                yy = year_only(seg)
                if yy and not re.search(r'date not shown', seg, re.I):
                    y = min(yy)
                    if y <= 1862:
                        facts['sep'].append((kind, datetime.date(y, 12, 31), 'year', seg))
                    elif y == 1863:
                        facts['unreadable'].append((kind, seg))
                    # 1864 or later: after the battle, not a separation before it
                else:
                    facts['nodate_sep'].append((kind, seg))
        # date garbling: segment has a month word followed by a year-like token that did not parse
        if re.search(MONREGEX, seg) and not dts and kind in ('disch', 'resign', 'dismiss', 'deserted', 'died', 'killed', 'mustout', 'transf_out', 'enl', 'comm', 'must'):
            if not re.search(r'date not shown|not shown', seg, re.I):
                facts['unreadable'].append((kind, seg))
    # return after separation text (e.g. "deserted ...; returned")
    if facts['sep']:
        s0 = facts['sep'][0]
        idx = [i for i, e in enumerate(facts['events']) if e[1] == s0[3]]
        later = ' ; '.join(e[1] for e in facts['events'][idx[0] + 1:]) if idx else ''
        if s0[0] in ('deserted', 'dismiss', 'disch'):
            ret_early = False
            ret_any = False
            for e in facts['events'][idx[0] + 1:] if idx else []:
                if RETURN_WORDS.search(e[1]):
                    ret_any = True
                    ds = e[2]
                    if not ds or ds[0][0] <= GB_END:
                        ret_early = True
            facts['returned_after_sep'] = ret_early
            facts['returned_late'] = ret_any and not ret_early
    return facts


MONREGEX = re.compile(r"\b(Jan|Feb|Mar|Apr|May|June?|Jul[yjv]?|Aug|Sept?|Oct|Nov|Dec)\b", re.I)


def label(facts, intra_partner_E=None):
    """returns (label, roll_status, basis_code, basis_words, flags)"""
    flags = []
    E, Eprec = facts['E'], facts['E_prec']
    if E is None and intra_partner_E is not None:
        E, Eprec = intra_partner_E, 'day'
        flags.append('E-from-intra-transfer-partner')
    # rule 2: casualty at Gettysburg
    if facts.get('gett_conflict') and not facts['gett_cas'] and not facts['cas_in_window']:
        k, seg = facts['gett_conflict'][0]
        flags.append('gettysburg-named-but-dated-before-battle')
        return ('Unknown', 'unreadable-or-ambiguous', 'CONFLICT', 'remark names Gettysburg but dates the %s before 1 July 1863: "%s"' % (k, seg[:100]), flags)
    if facts['gett_cas']:
        k, seg = facts['gett_cas'][0]
        return ('Present-Documented', 'named-present', 'CAS-REMARK', 'remark names Gettysburg: "%s"' % seg[:110], flags)
    if facts['cas_in_window']:
        k, d, seg = facts['cas_in_window'][0]
        return ('Present-Documented', 'named-present', 'CAS-REMARK-DATE', 'casualty event dated %s (inside 1-3 July 1863): "%s"' % (d, seg[:100]), flags)
    # rule 8: enlisted / arrived after battle
    if E is not None:
        c = classify_after_battle(E, Eprec)
        if Eprec == 'year' and E.year == 1863:
            flags.append('enlistment-month-unreadable-1863')
            return ('Unknown', 'unreadable-or-ambiguous', 'OCR-DATE-LOST', 'enlistment year 1863 but month unreadable', flags)
        if c == 1:
            what = {'enl': 'enlisted', 'draft': 'drafted', 'comm': 'commissioned', 'must': 'mustered', 'transf_in': 'transferred in'}.get(facts['E_kind'], 'entered')
            return ('Absent-Documented', 'not-yet-enlisted', 'ENL-AFTER', '%s %s (%s), after 3 July 1863' % (what, E, facts['E_raw']), flags)
    # rule 7: separation before
    for kind, d, prec, seg in facts['sep']:
        c = classify_after_battle(d, prec)
        if c == -1:
            if facts['returned_after_sep']:
                flags.append('separation-then-return-noted')
                return ('Unknown', 'unreadable-or-ambiguous', 'CONFLICT', '%s dated %s but the remark also notes a return: "%s"' % (kind, d, seg[:90]), flags)
            if facts.get('returned_late'):
                flags.append('separation-return-after-battle')
            return ('Absent-Documented', 'off-roll-before-battle', 'SEP-BEFORE', '%s %s%s (%s) before 1 July 1863' % (kind, d, ' (year only)' if prec == 'year' else '', seg[:70]), flags)
        if c is None:
            flags.append('separation-dated-July-1863-month-only')
            return ('Unknown', 'unreadable-or-ambiguous', 'OCR-DATE-LOST', 'separation dated "July 1863" by month only: "%s"' % seg[:90], flags)
    if facts['nodate_sep'] or facts['unreadable']:
        if facts['unreadable']:
            kind, seg = facts['unreadable'][0]
            flags.append('date-unreadable')
            return ('Unknown', 'unreadable-or-ambiguous', 'OCR-DATE-LOST', 'a %s date is not legible in the text layer: "%s"' % (kind, seg[:90]), flags)
        kind, seg = facts['nodate_sep'][0]
        flags.append('separation-date-not-shown')
        return ('Unknown', 'unreadable-or-ambiguous', 'DATE-NOT-SHOWN', 'separation without a date: "%s"' % seg[:90], flags)
    if E is None and facts['E_kind'] is None:
        flags.append('no-enlistment-date')
        return ('Unknown', 'unreadable-or-ambiguous', 'OCR-DATE-LOST', 'no legible enlistment or commission date', flags)
    if facts['wounded_1863_noplace']:
        flags.append('wounded-1863-place-not-stated')
    return ('Unknown', 'on-roll-undetermined', 'ONROLL-NO-STATUS', 'enlisted before the battle, no separation before it; the roster gives no status for 1-3 July 1863', flags)
