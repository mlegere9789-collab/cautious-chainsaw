"""Booth 1920, Records of Louisiana Confederate Soldiers and Louisiana Confederate Commands: extract every entry of the Gettysburg units of the order of battle,
parse the roll abstracts, label presence by PLAN section 2.2.
Run: python -I -X utf8 scripts/booth_parse.py   (from data/C-NCLA)  -> work/booth_entries.json
"""
import json, re, sys, os, glob, datetime
sys.path.insert(0, os.path.dirname(__file__))
from collections import Counter, defaultdict
from ncla_common import CACHE, DATA, low_priority

low_priority()
FILES = [('booth_v1', 'recordsofl00loui'), ('booth_v2p1', 'recordsoflo00loui'), ('booth_v2p2', 'recordsoflouisi00loui'), ('booth_v3b1p1', 'recordsoflouis00loui'),
         ('booth_v3b1p2', 'recordsofloui00loui'), ('booth_v3b2p1', 'recordsoflou00loui'), ('booth_v3b2p2', 'recordsoflouisia00loui')]
# infantry units: OOB id -> regimental number
INF = {'C-1LA-T': 1, 'C-2LA-T': 2, 'C-5LA': 5, 'C-6LA': 6, 'C-7LA': 7, 'C-8LA': 8, 'C-9LA': 9, 'C-10LA': 10, 'C-14LA': 14, 'C-15LA': 15}
ORD = {1: r'1\s*st', 2: r'2\s*(?:nd|d)', 5: r'5\s*th', 6: r'6\s*th', 7: r'7\s*th', 8: r'8\s*th', 9: r'9\s*th', 10: r'10\s*th', 14: r'14\s*th', 15: r'15\s*th'}
INFWORD = r"(?:In[a-z]{1,6}|Inf\.?|Lnfty|lnfty|Infy|Inf'ty)"
UNIT_RE = {n: re.compile(r"(?<![0-9A-Za-z])" + ORD[n] + r"\.?\s*(?:\((?:[A-Za-z'\. ]{3,18})\)\s*)?(?:Regt\.?\s*)?La\.?[\s,']*(?:Vols?\.?\s*)?(?:\([A-Za-z'\. ]{3,18}\)\s*)?" + INFWORD) for n in ORD}
CAV_ARTY = re.compile(r"(Cav|Arty|Art\b|Hvy|Heavy|Battn|Batt\b|Sharp|Mil\b|Militia)", re.I)

MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
OCR_MON = {'alay': 5, 'mav': 5, 'lune': 6, 'julv': 7, 'jnly': 7, 'sept': 9, 'siept': 9, 'ocl': 10, 'ota': 10, 'lec': 12, 'dee': 12, 'deo': 12, 'jau': 1, 'fob': 2, 'aim': 8, 'a_ug': 8, 'hull': None}


def mon(tok):
    t = re.sub(r'[^A-Za-z_]', '', tok).lower().replace('_', '')
    if t in OCR_MON and OCR_MON[t]:
        return OCR_MON[t]
    return MONTHS.get(t[:3])


YMAP = {'I': '1', 'l': '1', '|': '1', '!': '1', 'S': '8', 'X': '8', 'B': '8', '&': '8', 'O': '0', 'o': '0', 'Z': '2', 'G': '6', 'C': '6', 'b': '6', 'T': '1', 'i': '1', 's': '8', 'U': '0', 'Q': '0'}


def year(tok):
    t = re.sub(r'[^0-9A-Za-z&|!]', '', tok)
    if len(t) != 4:
        return None
    t = ''.join('8' if (i == 1 and c in '^>~*') else c for i, c in enumerate(t))
    d = ''.join(YMAP.get(c, c) for c in t)
    if not d.isdigit():
        return None
    if d[:2] != '18':
        return None
    third = d[2]
    if third == '0':
        third = '6'            # 180x does not occur; the 6 is read as 0
    y = int('18' + third + d[3])
    return y if 1861 <= y <= 1865 else None


GETT = re.compile(r"G[eo]t{1,2}[yvj]s|Gettv|Getty|Gettys\s*-?\s*burg|Gett\w{0,4}burg", re.I)
MY = r"([A-Za-z_]{3,9})\.?,?\s*(?:(\d{1,2})\s*(?:st|nd|rd|th|d)?\s*,?\s*)?([0-9IlSXOGBb&|!\^>~*i]{4})"
MYRE = re.compile(MY)
STATUS_KW = [
    ('notstated', re.compile(r"(?:presen\w+|pres\.?)\s*or\s*absen\w+\s*not\s*stated|absen\w+\s*or\s*presen\w+\s*not\s*stated|not\s*stated", re.I)),
    ('present', re.compile(r"\b(?:Present|Pres)\b|\bPres-?\s*ent|\bPresent\b", re.I)),
    ('absent', re.compile(r"Absen|Sick|Furlough|Detach|Hospl|Hospital|Wounded|Prisoner|Captured|Missing|On leave|With leave|Left|Detailed|Dutv|Duty|Recruit", re.I)),
    ('sep', re.compile(r"Died|Killed|Discharg|Deserted|Resign|Transf|Dropped|Dismiss|Retired|Cashier|Promoted|Appointed|Exchanged|Paroled|Disabled|Substitute", re.I)),
]


def first_status(s):
    best, bk = 10**9, None
    for k, rx in STATUS_KW:
        m = rx.search(s)
        if m and m.start() < best:
            best, bk = m.start(), k
    return bk


def ym(m, y):
    return (y, m)


def roll_statements(text):
    """Return a list of (start(y,m), end(y,m), status, matched text) from the roll abstracts of one entry."""
    out = []
    Y = r"[0-9IlSXOGBb&|!\^>~*i]{4}"
    # A: Rolls[ from| for| to] M[ D][ Y] (to|and) M[ D] Y [status]
    pa = re.compile(r"Rolls?['’]?\s*(?:from['’]?|for|to|on|of|dated)?\W{0,3}([A-Za-z_]{3,9})\.?\W{0,3}(?:\d{1,2}\W{0,3})?(?:(" + Y + r")\W{0,3})?(?:to|and|&)\s*([A-Za-z_]{3,9})\.?\s*,?\s*(?:\d{1,2}\s*,?\s*)?(" + Y + r")(.{0,70})", re.I)
    for m in pa.finditer(text):
        m1, y1, m2, y2, tail = mon(m.group(1)), m.group(2), mon(m.group(3)), year(m.group(4)), re.split(r'\bRolls?\b', m.group(5))[0]
        if not (m1 and m2 and y2):
            continue
        y1v = year(y1) if y1 else y2
        if y1v is None:
            continue
        st = first_status(tail)
        out.append(((y1v, m1), (y2, m2), st, m.group(0)[:110]))
    # B: Roll[ for] M[ D], Y  (single month)
    pb = re.compile(r"Rolls?\s*(?:for|of|dated)?\W{0,3}([A-Za-z_]{3,9})\.?,?\s*(?:\d{1,2}\s*,?\s*)?(" + Y + r")(.{0,70})", re.I)
    for m in pb.finditer(text):
        m1, y2, tail = mon(m.group(1)), year(m.group(2)), re.split(r'\bRolls?\b', m.group(3))[0]
        if not (m1 and y2):
            continue
        st = first_status(tail)
        out.append(((y2, m1), (y2, m1), st, m.group(0)[:110]))
    # C: Present on [all] Rolls [from M Y] to M Y   /  Roll(s) to M, Y, Present
    pc = re.compile(r"(Present|Absent|Pres)\s*(?:on|in)\s+(?:all\s+)?Rolls?\s+(?:(?:from|for)\s+([A-Za-z_]{3,9})\.?,?\s*(?:\d{1,2}\s*,?\s*)?(" + Y + r")\.?,?\s+)?to\s+([A-Za-z_]{3,9})\.?,?\s*(?:\d{1,2}\s*,?\s*)?(" + Y + r")", re.I)
    for m in pc.finditer(text):
        st = 'present' if m.group(1).lower().startswith('pres') else 'absent'
        m2, y2 = mon(m.group(4)), year(m.group(5))
        if not (m2 and y2):
            continue
        if m.group(2) and mon(m.group(2)) and year(m.group(3)):
            s0 = (year(m.group(3)), mon(m.group(2)))
        else:
            s0 = (1861, 1)         # from enlistment
        out.append((s0, (y2, m2), st, m.group(0)[:110]))
    pd = re.compile(r"Rolls?\s+to\s+([A-Za-z_]{3,9})\.?,?\s*(?:\d{1,2}\s*,?\s*)?(" + Y + r")(.{0,50})", re.I)
    for m in pd.finditer(text):
        m2, y2 = mon(m.group(1)), year(m.group(2))
        if m2 and y2:
            out.append(((1861, 1), (y2, m2), first_status(re.split(r'\bRolls?\b', m.group(3))[0]), m.group(0)[:110]))
    # D: Present on Roll(s) of / dated month year
    return out


_ABB = r"(?<=Co)\.|(?<=Regt)\.|(?<=Hospl)\.|(?<=La)\.|(?<=Va)\.|(?<=Md)\.|(?<=Pt)\.|(?<=Genl)\.|(?<=Gen)\.|(?<=Lt)\.|(?<=No)\.|(?<=Sept)\.|(?<=Dec)\.|(?<=Nov)\.|(?<=Oct)\.|(?<=Aug)\.|(?<=Jan)\.|(?<=Feb)\.|(?<=Mar)\.|(?<=Apr)\.|(?<=St)\.|(?<=Transfd)\.|(?<=Battn)\.|(?<=Arty)\.|(?<=Cav)\.|(?<=Tenn)\.|(?<=Miss)\.|(?<=Ala)\.|(?<=Pa)\.|(?<=Ga)\.|(?<=Ky)\.|(?<=Mo)\.|(?<=Ark)\.|(?<=Tex)\.|(?<=N)\.|(?<=C)\.|(?<=S)\."
SEP_RE = re.compile(r"(Died|Killed|Discharg\w*|Deserted|Resign\w*|Transf\w*|Dropped|Dismissed|Retired|Cashiered|Disabled)\b(?:[^.]|" + _ABB + r"){0,80}?([A-Za-z_]{3,9})\.?\s*,?\s*(\d{1,2})?\s*(?:st|nd|rd|th|d)?[\s,\.]*([0-9IlSXOGBb&|!\^>~*i]{4})", re.I)


HOSP_SKIP = re.compile(r"^\w*\s+(?:from\s+)?(?:the\s+)?(?:La\.?\s+|Gen\.?\s+|General\s+|Field\s+|Genl\.?\s+)?(?:Hosp|hosp)", re.I)
TRANSF_OUT = re.compile(r"^\w*\.?\s*(?:to|from)?\s*(?:the\s+)?(?:\d{1,2}\s*(?:st|nd|rd|th|d)|Navy|C\.\s*S\.|Cav|Arty|Art\b|Battn|Regt|Signal|Engineer|Ord|Conf)", re.I)


def sep_events(text):
    out = []
    for m in SEP_RE.finditer(text):
        kind = m.group(1)
        if kind.lower().startswith('discharg') and re.match(r"\w*\s*(?:from\s+)?(?:the\s+)?(?:\w+\.?\s+){0,2}Hosp", text[m.start() + len(kind):m.start() + len(kind) + 28], re.I):
            continue
        if kind.lower().startswith('transf'):
            tail = text[m.start():m.start() + 70]
            if not re.search(r"to\s+(?:the\s+)?(?:\d{1,2}\s*(?:st|nd|rd|th|d)\b|Navy|C\.\s*S\.|Cav|Arty|Art\b|Battn|Regt|Signal|Engineer|Ord|Conf|Gen\.)", tail, re.I):
                continue
            if re.search(r"Lookout|Delaware|Elmira|Johnson|Capitol|Fort|(?<![A-Za-z])Pt\.|Camp Chase|Camp Douglas|exchange", tail, re.I):
                continue
        mo, yr = mon(m.group(2)), year(m.group(4))
        if mo and yr:
            out.append((kind.lower()[:6], datetime.date(yr, mo, min(int(m.group(3)), 28) if m.group(3) and 1 <= int(m.group(3)) <= 31 else 15), m.group(0)[:100]))
    return out


ENL_RE = re.compile(r"\bEn(?:l)?[\.,]?\s+([^.]{0,40}?)([A-Za-z_]{3,9})\.?\s*,?\s*(\d{1,2})?\s*(?:st|nd|rd|th|d)?[\s,\.]*([0-9IlSXOGBb&|!\^>~*i]{4})", re.I)


def enlist(text):
    m = ENL_RE.search(text[:300])
    if not m:
        return None
    mo, yr = mon(m.group(2)), year(m.group(4))
    if mo and yr:
        d = int(m.group(3)) if m.group(3) and 1 <= int(m.group(3)) <= 31 else 15
        try:
            return datetime.date(yr, mo, min(d, 28))
        except ValueError:
            return None
    return None


START_TOK = re.compile(r"(?:P[vy]t|[IFl]'?vt|Corp|Sergt|Serg|Capt|Lt\.|Lieut|Col\.|Maj\.|Surg|Mus|Drum|Ensign|Adjt|Co\.|Cos\.|En\.|Regt|Battn|Artif|Wagon|Black|Fifer|Bugl|Driver|Q\.? ?M|Com\.|Chap)")
LOOSE_START = re.compile(r"^[A-Z][^,0-9]{0,38}?[,\.]\s+\S")


NOT_START = re.compile(r"^(Joined|Also|Transfd|Remarks|Record|Rolls?|Present|Federal|Appears|Paroled|Detailed|Promoted|Died|Killed|Deserted|Absent|Name|Reed|Sent|Forwd|Exchanged|Released|Took|Taken|Res|Born|Age|Single|Married)"+chr(92)+"b")
RANK_TOK = re.compile(r"(?:P[vy]t|[IFl]'?vt|Corpl?|Sergt|Serg|Capt|Lt|Lieut|Col|Maj|Surg|Asst|Mus|Drum|Ensign|Adjt|Artif|Driver|Bugl|Black|Wagon|Teams|Fifer|Q"+chr(92)+".? ?M|Chap|Steward|Cook|Nurse|Cadet|Sub|Recruit)"+chr(92)+"b")


def is_entry_start(p):
    if NOT_START.match(p) or not (LOOSE_START.match(p) and START_TOK.search(p[:110])):
        return False
    r = RANK_TOK.search(p[:90])
    c = re.search(r"Cos?"+chr(92)+".", p[:90])
    if r and c and c.start() < r.start():
        return False          # 'Co. F, 15th La. Inf. Pvt.' = a cross-reference tail, not an entry head
    return True


def paragraphs(path):
    """Yield (first_line_no, text) of Booth entries. Blank lines also occur inside an entry (column/page breaks), so a blank-line paragraph that does not
    look like an entry start is joined to the previous entry."""
    lines = open(path, encoding='utf-8', errors='replace').read().split('\n')
    raw, cur, start = [], [], None
    for i, l in enumerate(lines):
        if l.strip():
            if not cur:
                start = i
            cur.append(l.strip())
        elif cur:
            raw.append((start, ' '.join(cur)))
            cur = []
    if cur:
        raw.append((start, ' '.join(cur)))
    out = None
    for ln, t in raw:
        if out is None:
            out = [ln, t]
        elif is_entry_start(t):
            yield out[0], out[1]
            out = [ln, t]
        else:
            out[1] += ' ' + t
    if out:
        yield out[0], out[1]


def clean(t):
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'(\w)- (\w)', r'\1\2', t)       # hyphenated line ends
    return t


WA_RE = re.compile(r"(?<![0-9])([1-4])\s*(?:st|nd|rd|th|d)\.?\s*Co\.?[\s,]*(?:[A-Za-z\.]{3,7}\s+)?(?:Battn\.?\s+)?(?:La\.?\s+)?Washington\s+(?:La\.?\s*)?(?:Lt\.?\s*)?Art", re.I)
WA_ID = {'1': 'C-ART-Squires', '2': 'C-ART-Richardson', '3': 'C-ART-Miller-WA', '4': 'C-ART-Norcom'}
DON_RE = re.compile(r"Donaldsonv?ille?\s*(?:La\.?\s*)?(?:Lt\.?\s*)?Art|Landr[yv]'?s\s+Co|Maurin'?s", re.I)


def match_unit(head):
    m = WA_RE.search(head)
    if m:
        return WA_ID[m.group(1)], m
    m = DON_RE.search(head)
    if m:
        return 'C-ART-Maurin', m
    for uid, n in INF.items():
        m = UNIT_RE[n].search(head)
        if m:
            pre = head[max(0, m.start() - 12):m.start()]
            return uid, m
    return None, None


def main():
    entries = []
    stats = Counter()
    for tag, ia in FILES:
        path = glob.glob(os.path.join(CACHE, tag + '.*_djvu.txt'))[0]
        for ln, para in paragraphs(path):
            stats['paragraphs'] += 1
            p = clean(para)
            if len(p) < 25:
                continue
            head = p[:170]
            if not re.match(r"^[^,\.]{1,40}[,\.]\s", head):
                continue
            uid, m = match_unit(head)
            if not uid:
                continue
            # header text before the command phrase must not itself be a cavalry/artillery designation of the same number
            after = p[m.end():m.end() + 14]
            if uid in INF and CAV_ARTY.match(after.strip()):
                continue
            entries.append(dict(uid=uid, src=tag, ia=ia, line=ln, text=p))
            stats[uid] += 1
    json.dump(dict(stats=dict(stats), entries=entries), open(os.path.join(DATA, 'work', 'booth_entries.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print(dict(stats))


if __name__ == '__main__':
    main()
