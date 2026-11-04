"""Independent-audit repair pass for the REG roll files (written 30 Oct 2026 by the auditor, not the builder).

Reads the FROZEN pre-audit CSVs in data/REG/_pre_audit/ and writes the repaired roll CSVs to data/REG/.
Every change is a rule below; nothing is typed in by hand except the two page-image corrections in PAGE_IMAGE_FIXES.
Rules (defect ids refer to data/REG/AUDIT.md):
  L1  desertion dated 1-3 July 1863 is not a casualty at Gettysburg (it made 14 men Present-Documented).
  L2  hyphenated words in remarks ('Get- tysburg', 'trans- ferred') are joined before matching.
  L3  OCR-garbled 'Gettysburg' tokens (Oettriborg, Gettrtbvg, Gettsyburg) and garbled casualty words (KlUed, Cilled, Woimded) count.
  L4  a transfer clause with a date between the verb and 'to' ('Transferred, January 3, 1863, to V. R. C.') is a separation.
  L5  a month and year with an unreadable day ("Discharged Mar. '2(1, 1862") is enough to place a separation before 1 July 1863.
  L6  a remark that names a casualty or death but carries no legible date is unreadable-or-ambiguous, not on-roll-undetermined.
  L7  Battery A and Battery B: an enrolment date is taken only from an Enrolled/Mustered/Enlisted/Commissioned phrase, never from the
      first date of the remark (that made killed and wounded men 'not yet enlisted' and Absent-Documented).
  L8  Battery A is re-parsed by paragraph (the source prints one entry per paragraph); the first parse glued entries whose
      garbled names it could not recognise onto the entry above, giving one man another man's casualty or discharge.
  L9  'transferred to Battery A' in a Battery A entry is an inbound move, not a separation.
  N1  page headers and narrative text that the column parser took for men are moved to _quarantine/ (R-G8), with the reason.
  N2  rank, dates and trailing status words that sit in the name field are split out; a given-name initial that sits in the rank
      field is returned to the name; garbled names get the flag ocr-suspect-name.
"""
import csv, os, re, sys, json, collections, datetime
sys.path.insert(0, os.path.dirname(__file__))
from reg_common import parse_dates, GB_START, GB_END, COLUMNS, MON, mon_of, fix_year

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'REG')
PRE = os.path.join(OUT, '_pre_audit')
QUAR = os.path.join(OUT, '_quarantine')
CACHE = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'REG')
ROLL = ['u-3md', 'u-1md-eh', 'u-1md-phb', 'u-1md-cav', 'u-purnell-md', 'u-2ri', 'u-art-a1ri', 'u-art-b1ri', 'u-7wv', 'u-1wv-cav', 'u-3wv-cav', 'u-art-cwv']

GETT = re.compile(r'[GCOQ][eo]tt?[yvuj]?[a-z]?[bh]', re.I)
GETT_FUZZ = re.compile(r'\b[GCOQ][eo]t+[a-z]{1,4}b[a-z]{1,3}\b', re.I)          # Oettriborg, Gettrtbvg, Gettsyburg
CASW = re.compile(r"(\b[kc][il1u]{1,3}[el]{0,2}d\b|\b[kc]il+ed|\bw[o0][a-z]{1,4}[ed][il]?\b|wound|woimd|miss[il1]ng|captur|prisoner|mortal|died of w|in action|acti[o0]n|aeU|aoU)", re.I)
HARDCAS = re.compile(r"(\b[kc][il1u]{1,3}[el]{0,2}d\b|\b[kc]il+ed|\bw[o0][a-z]{1,4}[ed][il]?\b|wound|woimd|miss[il1]ng|captur|prisoner|mortal|died of w)", re.I)
DESERT = re.compile(r'desert|deserttd', re.I)
SEPVERB = re.compile(r"(disch|dis'd|diach|disoh|dlsch|des'd|dismiss|resign|rmgn|died|killed|desert|mustered out|mus'd out|mus\. out|dropped|cashier)", re.I)
NOSEP = re.compile(r'(re-?enlist|veteran|returned|rejoin|released|paroled|exchanged)', re.I)
MONTH_YEAR = re.compile(r"\b(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?[^A-Za-z0-9]{0,12}[0-9OSIl\(\)'\"\.,]{0,5}\s*[,.]?\s*['\"]?\s*(18\s?[56][0-9OSIl]|[56]\d)\b")
ENR = re.compile(r'(Mustered|Enrolled|Enlisted|Commissioned|Drafted)[^;]{0,40}?([A-Z][a-z]{2,8}\.? ?\d{1,2},? ?\d{4}|[A-Z][a-z]{2,8}\.? ?\d{1,2},? ?18\w\w)')


def ri_year_fix(s):
    """copied from ri_parse.py: the OCR reads the 6 of 186x as 0, G or S (1801 -> 1861); used for the Rhode Island texts only, as the builder did."""
    s = re.sub(r'\b18[0G]([1-5])\b', r'186\1', s)
    s = re.sub(r'\b1\.?[S8G]0?([1-5])\b', r'186\1', s)
    s = re.sub(r"'(0)([1-5])\b", r"'6\2", s)
    return s


def norm(rem, ri=False):
    r = re.sub(r'(?<=[A-Za-z])-\s+(?=[a-z])', '', rem or '')      # L2
    r = re.sub(r'\s+', ' ', r).strip()
    return ri_year_fix(r) if ri else r


def enrol_date(rem):
    """L7: enrolment date only from an Enrolled/Mustered/Enlisted/Commissioned/Drafted clause."""
    m = re.search(r'(Mustered|Enrolled|Enlisted|Commissioned|Drafted)\b[^;]*', rem)
    if not m:
        return None
    ds = parse_dates(m.group(0))
    return ds[0][0] if ds else None


def window_death(rem):
    """plain death dated 1-3 July 1863: cause and place not stated, so not a Gettysburg casualty."""
    for cl in rem.split(';'):
        if re.search(r'\bdied\b', cl, re.I) and not re.search(r'died of w', cl, re.I):
            for d, a, b in parse_dates(cl):
                if GB_START <= d <= GB_END:
                    return True
    return False


def has_gett(t):
    if GETT.search(t) or GETT_FUZZ.search(t):
        return True
    import difflib
    for tok in re.findall(r"[A-Za-z0-9\^\|\(\)]{6,14}", t):          # L3: Qet^tbun, Oettjiborg ...
        w = re.sub(r'[^A-Za-z]', '', tok).lower()
        if len(w) >= 6 and w[0] in 'gcoq' and w[1] in 'eo' and w[2] == 't' and difflib.SequenceMatcher(None, w, 'gettysburg').ratio() >= 0.6:
            return True
    return False


def end_of_month(y, mo):
    return datetime.date(y + (mo == 12), mo % 12 + 1, 1) - datetime.timedelta(days=1)


def month_year(cl):
    """(latest possible date) from a month and a year with an unreadable day; None if not found."""
    m = MONTH_YEAR.search(cl)
    if not m:
        return None
    mo = mon_of(m.group(1))
    ys = m.group(2).replace(' ', '')
    yr = fix_year(ys)
    if yr is None and len(ys) == 2:
        yr = 1800 + int(ys)
    if not mo or yr is None or not 1858 <= yr <= 1870:
        return None
    return end_of_month(yr, mo)


def sep_date(rem, self_batt=None):
    """earliest separation date in the remark: clause by clause (split at ';' and ':'); the date is read after the verb; L4, L5, L9."""
    best = None
    for cl in re.split(r'[;:]', rem):
        c = cl.strip()
        if re.search(r'accept\w*\s+(a\s+)?(promotion|commission)', c, re.I) and not re.search(r'accept\w*\s+(a\s+)?(promotion|commission)[^;]{0,60}\b(in|of)\s+(the\s+)?(\d+\w*|Third|Fourth|Fifth|Second|First)\b', c, re.I):
            continue                                                                 # promotion inside the same unit is not a separation
        if NOSEP.search(c) and not re.search(r'(disch|died|killed|deserted|dismiss)', c, re.I):
            continue
        has_to = re.search(r'trans\w*\b[^;]{0,40}?\bto\b', c, re.I)
        has_from = re.search(r'trans\w*\.?\s+from', c, re.I)
        if has_to and self_batt and re.search(r'trans\w*\b[^;]{0,25}?\bto\s+Battery\s+' + self_batt + r'\b', c, re.I):
            has_to = None                                                            # L9 inbound
        vm = SEPVERB.search(c)
        if vm or (has_to and not has_from):
            start = vm.start() if vm else has_to.start()
            tail = c[start:]
            ds = parse_dates(tail) or parse_dates(c)
            d = ds[0][0] if ds else (month_year(tail) or month_year(c))
            if d and (best is None or d < best):
                best = d
    return best


def window_desertion(rem):
    for cl in rem.split(';'):
        if DESERT.search(cl):
            for d, a, b in parse_dates(cl):
                if GB_START <= d <= GB_END:
                    return True
    return False


def casualty_in_window(rem):
    for cl in rem.split(';'):
        if HARDCAS.search(cl) and not DESERT.search(cl):
            for d, a, b in parse_dates(cl):
                if GB_START <= d <= GB_END:
                    return True
    return False


def label(rem, din, dout, self_batt=None, name=''):
    """PLAN 2.2 rules in order; returns (label, basis, roll_status, flags)."""
    fl = []
    gett_cl = [c for c in rem.split(';') if has_gett(c)]
    if any(CASW.search(c) for c in gett_cl):
        if not any(HARDCAS.search(c) for c in gett_cl):
            fl.append('casualty-word-not-legible')
        return 'Present-Documented', 'CAS-REMARK: remark names Gettysburg with a casualty event' + (' (casualty word lost in the OCR; the entry puts him in action at Gettysburg)' if fl else ''), 'named-present', fl
    if casualty_in_window(rem):
        return 'Present-Documented', 'CAS-REMARK: remark states a casualty dated 1-3 July 1863', 'named-present', fl
    sep = sep_date(rem, self_batt)
    early = dout if (dout and dout < GB_START) else (sep if (sep and sep < GB_START and not dout) else None)
    if early and din and din > early:
        # the enlistment date and the separation date disagree (one is an OCR error, or a neighbour's remark was joined to this man);
        # either reading puts him off the roll on 1-3 July 1863 (separated before, or enlisted after), so Absent-Documented stands, with a flag
        fl.append('dates-conflict-both-readings-absent' if din > GB_END else 'dates-conflict-separation-dated-before-enlistment')
    if dout and dout < GB_START:
        return 'Absent-Documented', 'SEP-BEFORE: separation from this roll dated %s, before 1 July 1863' % dout.isoformat(), 'off-roll-before-battle', fl
    if sep and sep < GB_START and not dout:
        return 'Absent-Documented', 'SEP-BEFORE: remark states a separation dated %s, before 1 July 1863' % sep.isoformat(), 'off-roll-before-battle', fl
    if window_death(rem):
        fl.append('died-in-battle-window-cause-not-stated')
        return 'Unknown', 'a death dated 1-3 July 1863 with no place or cause: not shown to be a casualty at Gettysburg', 'on-roll-undetermined', fl
    if din and din > GB_END:
        return 'Absent-Documented', 'ENL-AFTER: enlisted or mustered in %s, after 3 July 1863' % din.isoformat(), 'not-yet-enlisted', fl
    if window_desertion(rem):
        fl.append('deserted-in-battle-window')
        return 'Unknown', 'CONFLICT-FREE GAP: desertion dated 1-3 July 1863; a desertion is not a casualty at Gettysburg and the roll does not place him at the battle', 'on-roll-undetermined', fl
    if gett_cl:
        return 'Unknown', 'remark mentions Gettysburg without a casualty word: check page image', 'unreadable-or-ambiguous', fl
    if CASW.search(rem) and not re.search(r'(unknown|not known|not given|no further)', rem, re.I) and not parse_dates(rem) and not month_year(rem):
        return 'Unknown', 'OCR-DATE-LOST: remark names a casualty or a death but the date is not legible', 'unreadable-or-ambiguous', fl   # L6
    if din is None:
        return 'Unknown', 'no legible enlistment date', 'unreadable-or-ambiguous', fl
    return 'Unknown', 'ONROLL-NO-STATUS: on the roll before the battle, no separation before it; the roll gives no status for 30 June 1863', 'on-roll-undetermined', fl


def d_of(s):
    return datetime.date.fromisoformat(s) if s else None


# ---------------------------------------------------------------- name repair (N1, N2)
RANKW = r"(?:Private|Corporal|Corpl|Sergeant|Sergt|Captain|Capt|Lieut|1st Lieut|2nd Lieut|First Lieut|Second Lieut|Major|Colonel|Lieutenant|Musician|Bugler|Teamster|Wagoner|Farrier|Saddler|Blacksmith|Artificer|Hospital|Surgeon|Assistant|Adjutant|Quartermaster|Chaplain|Commissary|Ordnance|Principal|Cook|Chief)"
STATUSW = re.compile(r"[\s\.,]*\b(Desert\w*|Died|Disch\w*|Resign\w*|Rmgn\w*|Kil+ed|Ki[lU]+ed|Transf\w*|Muster\w*|Captur\w*|Parol\w*|Wounded|Promot\w*|Dismiss\w*)\b[,\.]?\s*$", re.I)
HEADER = re.compile(r"^(NAME|RANK|REMARKS|FIELD AND STAFF|NON-?COMMISSIONED|COMMISSIONED|ENLISTED|MUSTER|MUSTEK|DISCHARGE|DISCHAKQB|Return of|Aggregate|Total|Company [A-K]\b|Regiment|Roster)", re.I)
STOP = set('the and of was were which after on in at to by from with an his their had that for but not when while then this these those where'.split())
NAME_OK = re.compile(r"^[A-Z][A-Za-z'\-\.]+(?: [A-Za-z'\-\.]+){0,2}[,\.] ?[A-Z\.][A-Za-z\.' \-]*$")
OFFICER_OK = re.compile(r"^(?:[A-Z][A-Za-z\.'\-]+ ){1,3}[A-Z][A-Za-z'\-]+,?$")


def split_name(r, fam):
    """returns (name, rank, status_prefix, flags, quarantine_reason)"""
    nm = (r['name_as_printed'] or '').strip()
    rank = (r['rank_as_printed'] or '').strip()
    fl = []
    if fam == 'MD':
        m = re.search(r"(?:Infantry|Cavalry|fantry|alry|Infan-?\s?try)\.\s+", nm)
        if m and m.end() < len(nm):
            nm = nm[m.end():]; fl.append('page-header-text-stripped-from-name')
        m = re.search(r"\s+(" + RANKW + r"[A-Za-z\.]*)(.*)$", nm)
        if m and m.start() > 3:
            tail = (m.group(1) + m.group(2)).strip()
            nm = nm[:m.start()].strip()
            if not rank:
                rank = m.group(1).strip()
            fl.append('rank-and-dates-split-from-name')
    m = STATUSW.search(nm)
    prefix = ''
    if m and len(nm) > m.end() - m.start() + 3 and ',' in nm[:m.start()]:
        prefix = nm[m.start():].strip(' .,')
        nm = nm[:m.start()].strip(' .,')
        fl.append('status-word-split-from-name')
    mi = re.match(r"^((?:[A-Z]\.\s?)+)\s*(" + RANKW + r"\.?.*)?$", rank)
    if mi and nm and not re.search(r"[A-Z]\.$", nm) and mi.group(1).replace(' ', '') not in ('Q.M.', 'R.Q.M.', 'C.S.', 'Q.M.S.', 'A.Q.M.', 'A.A.G.', 'R.C.S.'):
        nm = (nm + ' ' + mi.group(1).strip()).strip(); rank = (mi.group(2) or '').strip(); fl.append('initial-returned-from-rank-to-name')
    elif nm.endswith(',') and rank and re.match(r"^[A-Z][a-z]+$", rank) and not re.match(RANKW, rank):
        nm = nm + ' ' + rank; rank = ''; fl.append('given-name-returned-from-rank-to-name')
    plain = nm.strip(' .,')
    toks = plain.split()          # whitespace words: a stop word glued into a garbled surname (ThouL-is, Thom.is) is not narrative
    reason = None
    if not plain or len(plain) < 3:
        reason = 'empty or one-letter name'
    elif HEADER.match(plain):
        reason = 'page header or table heading, not a man'
    elif re.search(r"\b(Jan|Feb|Mar|Apr|May|June|July|Aug|Sept|Oct|Nov|Dec)\b[a-z]*\.?\s+[0-9OIlS]", plain) and not NAME_OK.match(plain):
        reason = 'dates in the name field and no recoverable name'
    elif sum(1 for t in toks if t in STOP) >= 1 and not re.search(r"\b(of|de|von|van|la)\b", plain.split(',')[0].lower()):
        reason = 'running narrative text, not a man'
    elif len(toks) > 5:
        reason = 'more than five words in the name field: narrative or merged text'
    elif fam in ('WV',) and ',' not in plain and not OFFICER_OK.match(plain):
        reason = 'not a name pattern (WV narrative page text)'
    elif fam in ('WV',) and re.match(r'^(Record|Betum|Return|Rteord)\b', plain):
        reason = 'page heading of a company return, not a man'
    if reason is None:
        if not (NAME_OK.match(plain) or OFFICER_OK.match(plain)) or re.search(r"[0-9\|\(\)\*\\/<>=«»•]", plain) or re.search(r"^[a-z]", plain) or re.search(r"[uniml]{5,}", plain.lower().split(',')[0]):
            fl.append('ocr-suspect-name')
        elif ',' not in plain and fam != 'RIB' and r['section'] == 'roll' and len(toks) == 1:
            fl.append('name-incomplete')
    return nm, rank, prefix, fl, reason


def famof(n):
    return {'u-3md': 'MD', 'u-1md-eh': 'MD', 'u-1md-phb': 'MD', 'u-1md-cav': 'MD', 'u-purnell-md': 'MD', 'u-2ri': 'RI', 'u-art-a1ri': 'RIA', 'u-art-b1ri': 'RIB',
            'u-7wv': 'WV', 'u-1wv-cav': 'WV', 'u-3wv-cav': 'WV', 'u-art-cwv': 'WV'}[n]


# ---------------------------------------------------------------- Battery A re-parse by paragraph (L8)
INNER = re.compile(r"(?:(?<=[.;] )|(?<=[a-z], ))(?=(?:[A-Z0-9'/:;|()<>.\-]{3,}[,.]? )(?:[A-Z0-9'/:;|()<>.\-]{1,}[,.]? ){0,2}(?:Co\. [A-K],? )?(?:Enrolled|Killed|Wounded|Promoted|Discharged|Died|Mustered|Captured|Transferred|Deserted|Sick|Taken|Severely|Slightly|Absent|Dropped|Co\. [A-K]\.? ))")


def inner_split(p, cont=False):
    """split a paragraph where a second entry starts after a remark (the OCR lost the blank line); a cut is accepted only when the text before it
    already holds a remark (a lowercase word and an event verb), so 'SURNAME. GIVEN X.' is never cut in two."""
    cuts = [0]
    for m in INNER.finditer(p):
        seg = p[cuts[-1]:m.start()]
        if re.search(r'[a-z]{3,}', seg) and (cont or re.search(r'(Enrolled|Killed|Wounded|Promoted|Discharged|Died|Mustered|Captured|Transferred|Deserted|Dropped|Taken|prisoner|record)', seg, re.I)):
            cuts.append(m.start())
    cuts.append(len(p))
    return [p[a:b] for a, b in zip(cuts, cuts[1:])]


def ents_from_para(p, entries, dropped, sect, kl_sub):
    toks = p.split(' ')
    k = 0
    while k < len(toks) and not re.match(r'^[A-Z][a-z]{2,}[,.;:]?$', toks[k]) and not (k > 0 and toks[k] in ('Co.',)) and not re.match(r'^[a-z]', toks[k]):
        k += 1
    name = ' '.join(toks[:k]).strip(' ,.')
    rest = ' '.join(toks[k:])
    if k == 0 or len(name) < 4 or re.match(r'^[a-z]', toks[0]):
        if re.match(r'^[a-z]', toks[0]) and entries:      # page-break continuation of the entry above
            entries[-1]['text'] += ' ' + p
        else:
            dropped.append(p[:90])                        # narrative paragraph (not an entry)
        return
    entries.append(dict(name=name, text=rest, sect=sect if not kl_sub else kl_sub))



def battery_a_rows():
    L = open(os.path.join(CACHE, 'histbattery00aldrrich_djvu.txt'), encoding='utf-8', errors='replace').read().split('\n')[16888:18056]
    sect = 'Commissioned officers'
    paras = []
    cur = []
    for ln in L + ['']:
        if ln.strip():
            cur.append(re.sub(r'\s+', ' ', ln.strip()))
        elif cur:
            paras.append(' '.join(cur)); cur = []
    entries = []
    dropped = []
    SECT = [('RECORD OF THE ORIGINAL', 'Original members not returning'), ('RECRUITS FOR BATTERY', 'Recruits'), ('ATTACHED MEN FROM THE SECOND RHODE', 'Attached from 2nd RI Infantry'),
            ('ATTACHED MEN SERVING', 'Attached from other regiments'), ('LIST OF KILLED', 'Killed list')]
    SUB = {'Commissioned Officer.': 'Killed list: commissioned officer', 'Original Members.': 'Killed list: original members', 'Recruits.': 'Killed list: recruits'}
    kl_sub = ''
    for p in paras:
        p = re.sub(r'^[0-9]{3}\s+(?=[A-Z])', '', p)          # a page number printed in front of the paragraph
        up = p.upper()
        hit = [s for k, s in SECT if up.startswith(k)]
        if hit:
            sect = hit[0]; kl_sub = ''
            m = re.search(r'\bCOMMISSIONED OFFICER\.?\s*(.*)$', p)
            rest = p
            continue
        if p in SUB:
            kl_sub = SUB[p]; continue
        if re.match(r'^(APPENDIX|BATTERY A, FIRST|MATTERY|\d{3}$|COMMISSIONED OFFICERS ASSIGNED|ORGANIZATION,? JUNE)', p) or (re.search(r'ARTILLERY\s*$', p) and len(p) < 70) or re.match(r'^\d{3}\b', p) and len(p) < 40:
            continue
        if re.search(r'RETURN TO|UNIVERSITY OF CALIFORNIA|LIBRARY', p):
            break
        mt = re.match(r'^([0-9]{1,2}, [0-9]{4}\.)\s+(.*)$', p)           # "31, 1864. NAME..." : the date tail of the entry above, then a new entry
        if mt and entries:
            entries[-1]['text'] += ' ' + mt.group(1)
            p = mt.group(2)
        cont = bool(re.match(r'^([a-z0-9]|R\. ?I\.?,)', p))
        for q in inner_split(p, cont):                                        # an entry whose own paragraph break was lost
            q = q.strip()
            if not q:
                continue
            if (re.match(r'^[0-9]{4}[;,.]', q) or re.match(r'^[a-z]', q) or re.match(r'^R\. ?I\.?,', q)) and entries:   # page-break continuation of the entry above
                entries[-1]['text'] += ' ' + q
                continue
            ents_from_para(q, entries, dropped, sect, kl_sub)
    rows = []
    for e in entries:
        text = e['text'].replace('- ', '')
        rem = norm(text, ri=True)
        din = enrol_date(rem)                                 # L7
        lab, basis, rs, fl = label(rem, din, None, self_batt='A', name=e['name'])
        co = re.search(r'\bCo\. ([A-K])\b', e['name'] + ' ' + rem[:20])
        sec = e['sect']
        flags = list(fl)
        if re.search(r"[^A-Z .,'\-]", e['name']) or not re.search(r'[,.]', e['name']):
            flags.append('ocr-suspect-name')
        if sec.startswith('Original') and lab == 'Unknown' and rs == 'unreadable-or-ambiguous' and 'no legible enlistment date' in basis:
            lab, basis, rs = 'Unknown', 'ONROLL-NO-STATUS: listed in the appendix as an original member of the battery (enrolled 1861); no separation before 1 July 1863 and no status for the day', 'on-roll-undetermined'
        if sec.startswith('Commissioned') and lab == 'Unknown' and has_gett(rem) and re.search(r'(at the battles? of|chief of artillery|commanding)', rem, re.I):
            lab, basis, rs = 'Present-Documented', 'OFFICER-HISTORY: the regimental history names him at Gettysburg as an officer (here as chief of artillery of the Second Corps, not with Battery A)', 'named-present'
            flags.append('serving-outside-battery-a-at-the-battle')
        if sec.startswith('Commissioned') and lab == 'Present-Documented':
            flags.append('officer-may-have-served-in-another-unit-at-the-battle: check which unit the entry places him with')
        if re.search(r'Battery\s+B\b', rem) and lab == 'Present-Documented' and re.search(r'(wounded|killed)[^;]{0,60}Gettysburg', rem, re.I) and 'transferred to Battery A' not in rem and sec.startswith('Commissioned'):
            flags.append('attached-elsewhere')
        rows.append(dict(unit_id='U-ART-A1RI', regiment='Battery A, 1st Rhode Island Light Artillery', company=(co.group(1) if co else 'A'), section=sec, name_as_printed=e['name'],
                         rank_as_printed='', residence='', age='', date_in=din.isoformat() if din else '', date_out='', remarks_as_printed=text,
                         presence_label=lab, presence_basis=basis, roll_status=rs, source_id='RI-BATA-1904',
                         source_locator='IA histbattery00aldrrich djvu text appendix (book pp.390-407)',
                         parse_flags=';'.join(flags + ['reparsed-by-paragraph-in-audit', 'partial-source: appendix lists officers, members who did not return with the battery in June 1864, recruits, attached men and the killed; original members who returned are not listed'])))
    return rows, dropped


# ---------------------------------------------------------------- page-image corrections (read by the auditor from the page image, cached under tmp/library/rosters/REG/)
PAGE_IMAGE_FIXES = [
    # (file, match on name_as_printed, action, fields)
    ('u-1md-eh', 'Dillon, Lewis J.', 'set', dict(date_out='1865-07-17', remarks_as_printed='Veteran. Transferred to Company D, 11th Maryland Infantry.', extra_flag='corrected-from-page-image: parser had joined the next man\'s remarks (qa_md_p639.jpg, book p.617)')),
]
PAGE_IMAGE_ADDS = [
    ('u-1md-eh', dict(unit_id='U-1MD-EH', regiment='1st Maryland Eastern Shore Infantry', company='E', section='roll', name_as_printed='Eaton, Wm. H.', rank_as_printed='Private.', date_in='1861-10-31', date_out='',
                      remarks_as_printed='Killed in action, July, 1863, Gettysburg, Pa.', source_id='MD-HRMV-1898', source_locator='IA historyrosterofm01mary djvu page 639 (book p.617; page image qa_md_p639.jpg)',
                      parse_flags='added-from-page-image-in-audit: the OCR text lost this man\'s name line; the printed page reads Eaton, Wm. H., Private, Oct. 31, 1861, Killed in action, July, 1863, Gettysburg, Pa.')),
    ('u-1md-eh', dict(unit_id='U-1MD-EH', regiment='1st Maryland Eastern Shore Infantry', company='E', section='roll', name_as_printed='Dean, Bennett A.', rank_as_printed='Private.', date_in='1861-10-31', date_out='1864-09-20',
                      remarks_as_printed='Transferred to V. R. C.', source_id='MD-HRMV-1898', source_locator='IA historyrosterofm01mary djvu page 639 (book p.617; page image qa_md_p639.jpg)',
                      parse_flags='added-from-page-image-in-audit: the OCR text lost this man\'s name line (his dates and remark had been joined to Dillon, Lewis J.)')),
]


def main():
    os.makedirs(QUAR, exist_ok=True)
    log = collections.OrderedDict()
    for n in ROLL:
        rows = list(csv.DictReader(open(os.path.join(PRE, n + '.csv'), encoding='utf-8', newline='')))
        fam = famof(n)
        out, quar = [], []
        if n == 'u-art-a1ri':
            new, dropped = battery_a_rows()
            for r in new:
                out.append(r)
            log[n] = dict(pre_rows=len(rows), reparsed_rows=len(new), narrative_paragraphs_not_entries=len(dropped))
        else:
            for r in rows:
                if r['presence_label'] == 'Duplicate-Xref':
                    out.append(r); continue
                nm, rank, prefix, fl0, reason = split_name(r, fam)
                if reason:
                    r2 = dict(r); r2['quarantine_reason'] = reason; quar.append(r2); continue
                rem0 = r['remarks_as_printed']
                rem = norm((prefix + ' ' if prefix else '') + rem0, ri=fam in ('RI', 'RIB'))
                din, dout = d_of(r['date_in']), d_of(r['date_out'])
                if fam == 'RIB':
                    din = enrol_date(rem)                                  # L7
                lab, basis, rs, fl = label(rem, din, dout, self_batt='B' if fam == 'RIB' else None, name=nm)
                r2 = dict(r)
                r2.update(name_as_printed=nm, rank_as_printed=rank if fam not in ('RIB',) else r['rank_as_printed'], remarks_as_printed=(prefix + ' ' + rem0).strip() if prefix else rem0,
                          date_in=din.isoformat() if din else '', presence_label=lab, presence_basis=basis, roll_status=rs)
                if fam == 'RIB' and r['presence_label'] == 'Present-Documented' and re.search(r'attached to [^;]{0,40}Battery', rem0, re.I):
                    fl = fl + ['attached-to-another-unit-at-the-battle: see remarks']
                allfl = [x for x in (r['parse_flags'].split(';') if r['parse_flags'] else []) if x] + fl0 + fl
                if (lab, rs) != (r['presence_label'], r['roll_status']):
                    allfl.append('audit-relabelled-from:%s/%s' % (r['presence_label'], r['roll_status']))
                r2['parse_flags'] = ';'.join(dict.fromkeys(allfl))
                if fam == 'RIB' and r['presence_label'] == 'Duplicate-Xref':
                    r2 = r
                out.append(r2)
            # page-image corrections
            for f, key, act, fields in PAGE_IMAGE_FIXES:
                if f == n:
                    for r2 in out:
                        if r2['name_as_printed'] == key:
                            ef = fields.pop('extra_flag', '')
                            r2.update(fields)
                            din, dout = d_of(r2['date_in']), d_of(r2['date_out'])
                            lab, basis, rs, fl = label(norm(r2['remarks_as_printed']), din, dout)
                            r2.update(presence_label=lab, presence_basis=basis, roll_status=rs)
                            r2['parse_flags'] = ';'.join(x for x in (r2['parse_flags'], ef) if x)
            for f, add in PAGE_IMAGE_ADDS:
                if f == n:
                    a = dict(add); din, dout = d_of(a['date_in']), d_of(a['date_out'])
                    lab, basis, rs, fl = label(norm(a['remarks_as_printed']), din, dout)
                    a.update(presence_label=lab, presence_basis=basis, roll_status=rs, residence='', age='')
                    out.append(a)
            log[n] = dict(pre_rows=len(rows), rows=len(out), quarantined=len(quar))
        # write
        path = os.path.join(OUT, n + '.csv')
        with open(path, 'w', newline='', encoding='utf-8') as fh:
            w = csv.DictWriter(fh, fieldnames=COLUMNS, extrasaction='ignore')
            w.writeheader()
            for r in out:
                w.writerow(r)
        if quar:
            with open(os.path.join(QUAR, n + '.csv'), 'w', newline='', encoding='utf-8') as fh:
                w = csv.DictWriter(fh, fieldnames=COLUMNS + ['quarantine_reason'], extrasaction='ignore')
                w.writeheader()
                for r in quar:
                    w.writerow(r)
        c = collections.Counter(r['presence_label'] for r in out)
        log[n]['labels'] = dict(c)
    json.dump(log, open(os.path.join(OUT, '_audit_run.json'), 'w'), indent=1)
    print(json.dumps(log, indent=1))


if __name__ == '__main__':
    main()
