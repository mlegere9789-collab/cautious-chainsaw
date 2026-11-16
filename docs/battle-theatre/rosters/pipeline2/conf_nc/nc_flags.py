"""Marks derived from the printed text of a Moore roster entry, for the flag files (never written into the unit file).

Codes of ocr_uncertain (a row carries every code that matched; an empty result does not say the line is clean, it says no pattern matched):
  N  name text damaged: a digit or a mark inside a name token, a lower-case first letter, a capital inside a word (BuUis), a name that is only a surname
  H  the head (name, rank, marker) was cut by a rule that is a reading: a head recovered backwards from a marker inside the remarks of the line above, a weak
     marker (c. o. a. for e.), a head with no marker (county or event word right after the name), a rank-less officer head, a stray mark taken out of the name
  C  the company heading above the row is damaged: the letter is the one the sequence of headings gives (company_inferred lists the stretches)
  R  rank text damaged: the printed rank is not made of the rank words the roll prints
  Y  a year or a date in the remarks is damaged ('6!, 1S63, '(i3)
  G  garbage marks of the scan (^ | ~ ■ • { } \\ < > _) stand in or beside the line, or a lone mark or letter stands between two words
  M  the line may hold more than one entry: a second marker of enlistment or commission (e. cm. followed by a month) stands in its remarks, or a name-like run
     with a comma stands after a period inside the remarks
  W  a word of the remarks is damaged: a word that stands at most 3 times in the 41 unit files and differs by one letter from a word that stands at least 30 times
     and ten times as often, or a word with a digit or a mark inside letters

These marks are patterns of damage written after reading the text layer; the independent sample of roster-qa (R-G9) has not been run on this item, so the share of
the damaged lines that they flag is not known.  A line that no pattern matches is not thereby clean.
"""
import re, collections, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nc_dates as D

CODES = {
    'N': 'name text damaged: a digit or a mark inside a name token, a lower-case first letter, a capital inside a word, or a name that is only a surname',
    'H': 'the head of the entry was cut by a rule that is a reading: a head recovered backwards from a marker inside the remarks of the line above, a weak marker (c. o. a. for e.), '
         'a head with no enlistment marker (county or event word right after the name), an officer head without rank, a stray mark taken out of the name',
    'C': 'the company heading above the row is damaged: the company letter is the one the sequence of headings gives (company_inferred lists the stretches)',
    'R': 'rank text damaged: the printed rank is not made of the rank words the roll prints',
    'Y': "a year or a date in the remarks is damaged ('6!, 1S63, '(i3 and the like)",
    'G': 'garbage marks of the scan (^ | ~ and the like) stand in or beside the line, or a lone mark or letter stands between two words',
    'M': 'the line may hold more than one entry: a second marker of enlistment or commission (e. cm. followed by a month) stands in its remarks, or a name-like run with a comma follows a period inside the remarks',
    'W': 'a word of the remarks is damaged: a rare word one letter away from a frequent word, or a word with a digit or a mark inside letters',
}
PARTICLES = {'de', 'van', 'von', 'la', 'le', 'du', 'di', 'da', 'del', 'der', 'den', 'ter', 'ten', 'dos', 'des', 'el', 'al', 'af', 'ap', 'mc', 'mac', 'st'}
RANK_VOC = {'colonel', 'lieutenant', 'lieut', 'lt', 'col', 'major', 'maj', 'captain', 'capt', 'adjutant', 'adjt', 'surgeon', 'asst', 'assistant', 'chaplain', 'quartermaster', 'q', 'm', 'a', 'c', 's', 'sergeant',
            'sergt', 'serg', 'sgt', 'corporal', 'corpl', 'corp', 'musician', 'bugler', 'artificer', 'farrier', 'blacksmith', 'saddler', 'sadler', 'wagoner', 'teamster', 'fifer', 'drummer', 'guidon', 'ensign',
            'commissary', 'hospital', 'steward', 'ordnance', 'private', 'cook', 'and', 'of', 'ord', 'drum', 'regimental', 'chief', 'band', 'leader', 'master', 'bandmaster', 'cavalry'}
ORD_RANK = re.compile(r"^[1-9](?:st|d|nd|rd|th)$")
MARKS = "\"'`^*|[]()<>~_•■#:;,.-—"
BAD_MARK = re.compile(r"[\^|~■•{}\\<>_]")
def second_marker(rem):
    """A second enlistment/commission marker (e. cm. em. + a month or a year) inside the remarks with a name-like run (a capitalised token ending with a comma) right
    before it: the remarks probably hold another entry."""
    toks = rem.split()
    for i in range(1, len(toks) - 1):
        t = toks[i]
        if re.fullmatch(r"(?:e|cm|em|en|crn|cin|cni|ern)[\.,;:]+[\-—~'’\"\^\*]{0,2}", t) or re.fullmatch(r"(?:e|cm|em)[\.,;:]+[A-Z][a-z]{2,}\S*", t):
            glued = bool(re.fullmatch(r"(?:e|cm|em)[\.,;:]+[A-Z][a-z]{2,}\S*", t))
            nxt = toks[i + 1]
            if glued or re.match(r"^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|in|['’`‘\"])", nxt, re.I):
                look = toks[max(1, i - 6):i]
                if any(re.match(r"^[^\w\s]{0,2}[A-Z][A-Za-z'’\-\.]*,", x) for x in look):
                    return True
    return False


SECOND_MARK = re.compile(r"(?:^|\s)(?:e|cm|em|en|crn|cin|cni|ern)\.\s+(?:[A-Z][a-z]{2,}|in\s+['’]|['’])|(?:^|\s)(?:e|cm|em)[\.,;:]+[A-Z][a-z]{2,}")
NAMELIKE_RUN = re.compile(r"\.\s+[A-Z][A-Za-z'’\-]{2,},\s+[A-Z][A-Za-z\.\-]*\.?,?\s+(?:e|cm|em)\.")
TOKCLEAN = re.compile(r"[^a-z]")


def name_damaged(name, kind):
    toks = name.split()
    alpha_toks = 0
    for t in toks:
        c = t.strip(MARKS)
        if not c:
            continue
        if re.search(r"[0-9]", c) and not re.fullmatch(r"[1-9][0-9]?(?:st|nd|rd|th|d)", c):
            return True
        if re.search(r"[^A-Za-z'’\-\.]", c):
            return True
        if c[:1].islower() and c.lower() not in PARTICLES:
            return True
        if re.search(r"[a-z][A-Z]", c) and not re.match(r"^(?:Mc|Mac|De|Di|La|Le|Van|Du|O')", c) and not re.search(r"(?:Mc|Mac)[A-Z]", c):
            return True
        if re.search(r"[\^\\|~*]", t):
            return True
        if len(re.sub(r"[^A-Za-z]", "", c)) >= 2:
            alpha_toks += 1
    if kind.startswith('S'):
        given = [t for t in toks[1:] if re.search(r"[A-Za-z]", t)]
        if not given:
            return True                                   # a surname alone: the given name is lost in the text layer
    return False


def rank_damaged(rank):
    if not rank or rank.startswith('^'):
        return False
    for w in re.split(r"[\s\-]+", rank):
        c = re.sub(r"[^A-Za-z0-9]", "", w)
        if not c:
            continue
        if ORD_RANK.match(c):
            continue
        if c.lower() in RANK_VOC:
            continue
        return True
    return False


def year_damaged(remarks):
    for w in remarks.split():
        t = w.strip(',.;:()')
        if re.fullmatch(r"['’`‘\"]\S{1,3}", t):
            if re.fullmatch(r"['’`‘\"]6[0-5]", t) or re.fullmatch(r"['’`‘\"][0-9]{2}", t):
                continue
            if re.fullmatch(r"['’`‘\"][a-z]{1,3}", t):
                continue                              # a quoted word, an apostrophe in a word
            return True
        if len(t) == 4 and re.fullmatch(r"[1lI|!][0-9SsGgOoBbIl|!]{3}", t) and not re.fullmatch(r"18[0-9]{2}", t) and sum(ch.isdigit() for ch in t) >= 1:
            return True
    return False


def garbage(name, remarks):
    s = name + ' ' + remarks
    if BAD_MARK.search(s):
        return True
    for w in s.split():
        if len(w) == 1 and w in '|!{}[]^~*_' or w in ('j', 'i', 'l', '1', 'I', '!') and False:
            return True
    return False


def build_vocab(all_remarks):
    cnt = collections.Counter()
    for rem in all_remarks:
        for w in rem.split():
            t = TOKCLEAN.sub('', w.lower())
            if len(t) >= 4:
                cnt[t] += 1
    return cnt


_near = {}


def _variants(t):
    out = set()
    L = 'abcdefghijklmnopqrstuvwxyz'
    for i in range(len(t)):
        out.add(t[:i] + t[i + 1:])
        for ch in L:
            out.add(t[:i] + ch + t[i + 1:])
    for i in range(len(t) + 1):
        for ch in L:
            out.add(t[:i] + ch + t[i:])
    for i in range(len(t) - 1):
        out.add(t[:i] + t[i + 1] + t[i] + t[i + 2:])
    out.discard(t)
    return out


def word_damaged(rem, vocab):
    for w in rem.split():
        c = w.strip(MARKS)
        if not c:
            continue
        if re.search(r"[A-Za-z][0-9]|[0-9][A-Za-z]", c) and not re.fullmatch(r"[0-9]{1,2}(?:st|nd|rd|th|d|lh|tb|tli)?|['’]?[0-9OoSsIl]{2}", c) and not re.fullmatch(r"[0-9]+[A-Za-z]{1,3}", c):
            return True
        if re.search(r"[A-Za-z][\^\\|~*@#&%][A-Za-z]", c):
            return True
        t = TOKCLEAN.sub('', c.lower())
        if len(t) >= 5 and vocab.get(t, 0) <= 3:
            if t not in _near:
                _near[t] = [v for v in _variants(t) if vocab.get(v, 0) >= 30 and vocab.get(v, 0) >= 10 * max(1, vocab.get(t, 0))]
            if _near[t]:
                return True
    return False


def normalise_name(name, kind):
    """'Surname, Given M., Jr.' -> 'Given M. Surname Jr.' (surname-first heads); a given-first name keeps its order; stray marks at the ends of tokens are taken off, no
    letter is changed; '' where the printed name has no comma after the surname in a surname-first head."""
    clean = []
    for t in name.split():
        c = t.strip("\"'`^*|[]()<>~_•■#:;")
        if c:
            clean.append(c)
    if not clean:
        return ''
    if kind.startswith('S'):
        idx = next((i for i, w in enumerate(clean) if w.endswith(',')), -1)
        if idx < 0:
            return ''
        surname = ' '.join(w.rstrip(',') for w in clean[:idx + 1])
        rest = [w.rstrip(',') for w in clean[idx + 1:]]
        suffix = ''
        if rest and re.fullmatch(r"(?:Jr|Sr|[1-9][0-9]*(?:st|nd|rd|th|d))\.?", rest[-1]):
            suffix = rest.pop()
        return ' '.join(rest + [surname] + ([suffix] if suffix else [])).strip()
    return ' '.join(w.rstrip(',') if i == len(clean) - 1 else w for i, w in enumerate(clean))


def row_codes(r, vocab):
    """Codes of one row: r is the dict of parse_section (row, kind, co_rule, ...) with the 7-field row in r['row']."""
    name, rank, co, rem, page, off, rd = r['row']
    kind = r['kind']
    cs = set()
    if name_damaged(name, kind):
        cs.add('N')
    if kind not in ('S-mark', 'G-rank') or r.get('lone_dropped') or r.get('lowercase_head'):
        cs.add('H')
    if r.get('co_rule') in ('sequence', 'out-of-sequence', 'inferred-after-privates'):
        cs.add('C')
    if rank_damaged(rank):
        cs.add('R')
    if year_damaged(rem):
        cs.add('Y')
    if garbage(name, rem):
        cs.add('G')
    if second_marker(rem) or NAMELIKE_RUN.search(rem):
        cs.add('M')
    if word_damaged(rem, vocab):
        cs.add('W')
    return cs


def make_flags(unit_key, rows, vocab, raw_sha, extra=None):
    """The flag file of a unit.  rows: the dicts of parse_section in file order (any supplement rows with 'seg' = 1)."""
    n = len(rows)
    byc = {c: [] for c in CODES}
    onyes, onno, basis = [], [], []
    bidx = {}
    names_g, g_dated = [], []
    norm = []
    kinds = collections.defaultdict(list)
    for i, r in enumerate(rows):
        for c in sorted(row_codes(r, vocab)):
            byc[c].append(i)
        name, rank, co, rem, page, off, rd = r['row']
        norm.append(normalise_name(name, r['kind']))
        if D.names_gettysburg(rem):
            names_g.append(i)
            if D.gettysburg_dated(rem):
                g_dated.append(i)
        v, b = D.onroll(rem)
        if v in ('yes', 'no'):
            if b not in bidx:
                bidx[b] = len(basis)
                basis.append(b)
            (onyes if v == 'yes' else onno).append([i, bidx[b]])
        if r['kind'] not in ('S-mark', 'G-rank'):
            kinds[r['kind']].append(i)
    unc = sorted(set(i for c in byc.values() for i in c))
    # company_inferred: stretches of rows under a heading whose letter the sequence gave
    ci, cskip = [], []
    cur = None
    for i, r in enumerate(rows):
        rule = r.get('co_rule')
        if rule in ('sequence', 'skip', 'out-of-sequence', 'inferred-after-privates'):
            if cur and cur['rule'] == rule and cur['co'] == r['row'][2] and cur['heading'] == r.get('co_heading') and cur['last_row'] == i - 1:
                cur['last_row'] = i
                cur['n_rows'] += 1
            else:
                cur = {'first_row': i, 'last_row': i, 'n_rows': 1, 'co': r['row'][2], 'rule': rule, 'heading': r.get('co_heading'), 'offset': r.get('co_off')}
                (cskip if rule == 'skip' else ci).append(cur)
    out = {
        'f': 'roster2-flags/1', 'u': unit_key, 'n': n, 'unit_file_raw_lines_sha256': raw_sha,
        'about': 'row numbers count the rows of the unit file in file order from 0; "ocr_uncertain" = the printed line is damaged in the text layer in at least one of the ways of the codes below '
                 '(an empty result does not say the line is clean, it says no pattern matched); the rows are never repaired; "on_rolls_july_1863" is inferred from printed enlistment and '
                 'separation dates only and is no statement that the man was at Gettysburg; "normalised_names" only re-orders the printed tokens as Given Surname and strips stray marks at their '
                 'ends, no letter is changed ("" where the printed head has no comma after the surname); "names_gettysburg" lists the rows whose printed remarks name Gettysburg (an '
                 'OCR-tolerant match, a lower bound) and "gettysburg_dated" those whose clause also prints 1, 2 or 3 July 1863; "head_kinds" lists the rows whose head was cut by a rule that is a '
                 'reading, by kind; "company_inferred" lists the stretches of rows under a company letter that the sequence of headings gave (flag C) and "company_skips" the stretches under a clean printed '
                 'letter that skips a letter of the sequence (the letter is the printed one, no flag); "segment_of_row" lists the rows that were read from the second scan (supplement)',
        'codes': CODES,
        'rows': {c: v for c, v in byc.items() if v},
        'ocr_uncertain': unc,
        'on_rolls_july_1863': {
            'rule': 'yes: a printed enlistment or commission date on or before 30 June 1863 (or inside 1-3 July 1863), no printed separation (died, killed, discharged, resigned, deserted, transferred out, '
                    'promoted out of the regiment) dated before 1 July 1863, no undated separation, no return after a separation, no damaged date in a start or separation clause; no: the printed '
                    'enlistment date is after 3 July 1863, or a separation is printed with a date before 1 July 1863 and nothing returns the man afterwards; every other row is unknown (no date, '
                    'a damaged date, an undated separation, doubtful cases). A month-and-year date counts only where it lies certainly before or after the day compared with.',
            'basis': basis, 'yes': onyes, 'no': onno},
        'normalised_names': norm,
        'names_gettysburg': names_g, 'gettysburg_dated': g_dated,
        'head_kinds': {k: v for k, v in sorted(kinds.items())},
        'company_inferred': ci, 'company_skips': cskip,
        'printed_page_from_running_head': [],
    }
    if extra:
        out.update(extra)
    return out


# Rows whose printed line was looked at on a page image.  The unit file keeps the text layer as it is (a line must be locatable at its offset in the pinned text); the reading of the page goes
# here, with its evidence, and never into the line.  The reading of a page image is the engineer's own look at a transient image (not stored); a tesseract read is not one.
PAGE_IMAGE_READINGS = {
    'c-nc-2nd-north-carolina-cavalry': [
        {'text_id': 'NC-MOORE-1882.2~b', 'offset': 370257, 'field': 'name', 'printed': 'Walker, Jesse M.',
         'how': 'page image of the other copy of the volume (Internet Archive item rosterofnorthcar02nort, leaf 130, printed page 116; text PDF of archive.org/cors rendered at 200 dpi, looked at '
                'on 2026-11-16, not stored): the line prints "Walker, Jesse M., e. June 18th, \'61."; the text layer of that copy reads the middle initial as M. too (NC-MOORE-1882.2, offset 383417); '
                'the text layer of the primary copy reads the initial as two capital letters, which the unit file keeps as the layer prints it'},
    ],
}


def page_readings(unit_key, rows):
    """The reviewed page-image readings of a unit as a list for the flag file; each is tied to its row by the offset of the row in the pinned text."""
    out = []
    for e in PAGE_IMAGE_READINGS.get(unit_key, []):
        idx = [i for i, r in enumerate(rows) if r['row'][5] == e['offset']]
        if len(idx) != 1:
            raise ValueError('page-image reading of %s at offset %d: %d rows found' % (unit_key, e['offset'], len(idx)))
        d = dict(e)
        d['row'] = idx[0]
        out.append(d)
    return out
