"""Token classes of the Bates roster pages (what a word of the text layer is, judged on its characters only).

Nothing here changes a word: the functions only say what kind of word it is, or where it can be cut when the text layer glued the name
cell to the rank cell with a run of leader dots.
"""
import re
from functools import lru_cache

_MONTHS = ('jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec')
MONTH_STRICT = re.compile(r"^[.'‘’`\"]*(Jan\.?|January|Feb\.?|February|Mar\.?|March|Mch\.?|Apr\.?|April|May|June?|July?|Aug\.?|August|Sept?\.?|September|Oct\.?|October|Nov\.?|November|Dec\.?|December)[.,;:]*$")
# the month word of a damaged date cell: the same with the slips seen in the text layer (Mav, Muc, Juno, Julv, Mcli ...)
MONTH_LOOSE = re.compile(r"^[.'‘’`\"]*(Jan|Feb|Mar|Apr|Ma[yvu]|Mac|Mch|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Juno|Julv|Muc)[a-z]{0,6}[.,;:]*$", re.I)

# a ditto mark in the rank cell ("do", "...do", "L.do", "do...." ...)
DITTO_ONLY = re.compile(r"^[^A-Za-z0-9]*[ilI1|!]?[^A-Za-z0-9]*(?:do|Do|d0|dc|dn|dp|cio|dp)[^A-Za-z0-9]*$")
DITTO_TAIL = re.compile(r"^(?P<pre>.*[A-Za-z0-9])(?P<lead>[^A-Za-z0-9]+[ilI1|!]?[^A-Za-z0-9]*)(?P<do>do|Do|d0)(?P<post>[^A-Za-z0-9]*)$")
LEADER_RUN = re.compile(r"\.{2,}")

RANK_WORDS = {
    'private', 'privates', 'priv', 'capt', 'captain', 'col', 'colonel', 'lt', 'lieut', 'lieutenant', 'major', 'maj', 'adj',
    'adjutant', 'surg', 'surgeon', 'chap', 'chaplain', 'sergt', 'sergeant', 'sgt', 'serg', 'sergts', 'corp', 'corporal', 'cor',
    'cpl', 'corpl', 'mus', 'musician', 'muc', 'wagoner', 'saddler', 'farrier', 'blacksmith', 'bugler', 'artificer', 'teamster',
    'leader', 'sr', 'qm', 'qms', 'com', 'coms', 'hos', 'stew', 'steward', 'asst', 'sur', 'assur', 'asssur', 'qmsgt', 'qmsergt',
    '1st', '2d', '3d', 'ist', 'tst', 'lst', 'sergtmaj', 'sgtmaj', 'drummer', 'fifer', 'trumpeter', 'bugle', 'blksmith', 'sad', 'wag',
}
# words that only make a rank together with another rank word are not alone a rank (a surname can be "Major" or "Drum")
RANK_ALONE_NOT = {'sr', 'com', 'coms', 'stew', 'steward', 'sur', 'hos', 'cor', 'sad', 'wag', 'bugle', 'leader', 'asst'}


def core(t):
    return re.sub(r'[^A-Za-z0-9]', '', t)


def lev(a, b, cap=2):
    if abs(len(a) - len(b)) > cap:
        return cap + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


_LONG = [w for w in RANK_WORDS if len(w) >= 6]


def is_month(t):
    return bool(MONTH_STRICT.match(t))


def is_month_loose(t):
    return bool(MONTH_LOOSE.match(t))


def is_ditto(t):
    return bool(DITTO_ONLY.match(t))


@lru_cache(maxsize=200000)
def rank_like(t):
    """Does the word read as (a damaged form of) a rank word or a ditto mark of the rank cell?  (a single letter never does)"""
    if is_ditto(t):
        return True
    c = core(t).lower()
    if len(c) < 2:
        return False
    if c in RANK_WORDS:
        return True
    if len(c) >= 5:
        for w in _LONG:
            if lev(c, w, 2 if len(w) >= 8 else 1) <= (2 if len(w) >= 8 else 1):
                return True
    return False


def split_glued(t):
    """A word of the name cell that the text layer glued to the rank cell: returns (name part, rank part) or None.
    Cut rules (the word itself is never changed, the two parts are consecutive pieces of it):
      * a run of two or more leader dots followed by a ditto mark or a rank word:  name = what stands before the run
      * an initial or name word directly followed by 'do' ("L.do"):                name = what stands before 'do'
    """
    m = LEADER_RUN.search(t)
    if m and m.start() > 0 and re.search(r'[A-Za-z0-9]', t[:m.start()]):
        tail = t[m.end():]
        if tail and re.search(r'[A-Za-z0-9]', tail) and rank_like(tail.strip(".,:;'`|!")):
            return t[:m.start()], tail
        # a stray mark between the run and the ditto ("....l...do", "....|...do"): look for a ditto at the end of the tail
        m2 = re.search(r'(?:do|Do|d0)[^A-Za-z0-9]*$', tail)
        if m2 and len(tail[:m2.start()]) <= 6:
            return t[:m.start()], tail
    m3 = DITTO_TAIL.match(t)
    if m3 and not LEADER_RUN.search(t) and len(m3.group('pre')) >= 1 and len(m3.group('lead')) <= 2:
        k = len(m3.group('pre')) + len(m3.group('lead'))
        pre = t[:len(m3.group('pre'))]
        # the period that belongs to the initial stays with the name
        if m3.group('lead').startswith('.'):
            pre = pre + '.'
            k2 = len(pre)
        else:
            k2 = len(m3.group('pre'))
        if re.search(r'[A-Za-z]', pre):
            return t[:k2], t[k2:]
    return None
