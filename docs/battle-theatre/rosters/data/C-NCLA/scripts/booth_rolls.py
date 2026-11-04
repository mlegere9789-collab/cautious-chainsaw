"""Roll-statement parser for Booth 1920 entries (replaces roll_statements/year in booth_parse.py).
Token based: month tokens, optional day, year tokens with OCR repair. A statement is a roll period (start, end) followed by a status phrase.
"""
import re
import booth_parse as bp

YCH = r"[0-9IlSXOGBb&|!\^>~*i]"
YR = YCH + r"{4}"
MONTH_TOK = r"[A-Za-z_]{3,9}"
SEP = r"[\s,\.;:'’]{0,4}"
DAY = r"(?:\d{1,2}\s*(?:st|nd|rd|th|d)?)"

SYM8 = set('^>~*')


def year(tok):
    t = re.sub(r"[^0-9A-Za-z&|!\^>~*]", '', tok)
    if len(t) != 4:
        return None
    ch = list(t)
    if ch[1] in SYM8:
        ch[1] = '8'
    d = ''.join(bp.YMAP.get(c, c) for c in ch)
    if not d.isdigit() or d[:2] != '18':
        return None
    third = '6' if d[2] == '0' else d[2]
    y = int('18' + third + d[3])
    return y if 1861 <= y <= 1865 else None


def cut_tail(t):
    return re.split(r"\bRolls?\b|\bFederal\b|\bAppears\b", t)[0]


# Rolls[ from| for| to| of] M[ D][ Y] (to|and|&) M[ D] Y
PA = re.compile(r"Rolls?['’]?" + SEP + r"(?:from['’]?|for|to|on|of|dated)?" + SEP + r"(" + MONTH_TOK + r")" + SEP + r"(?:" + DAY + SEP + r")?(?:(" + YR + r")" + SEP + r")?(?:to|and|&)" + SEP + r"(" + MONTH_TOK + r")" + SEP + r"(?:" + DAY + SEP + r")?(" + YR + r")(?=(.{0,90}))", re.I)
# Roll[ for] M[ D] Y   (single month)
PB = re.compile(r"Rolls?" + SEP + r"(?:for|of|dated)?" + SEP + r"(" + MONTH_TOK + r")" + SEP + r"(?:" + DAY + SEP + r")?(" + YR + r")(?=(.{0,90}))", re.I)
# Present on [all] Rolls [from M Y] to M Y
PC = re.compile(r"(Present|Absent|Pres)" + SEP + r"(?:on|in)\s+(?:all\s+)?Rolls?\s+(?:(?:from|for)\s+(" + MONTH_TOK + r")" + SEP + r"(?:" + DAY + SEP + r")?(" + YR + r")" + SEP + r")?to\s+(" + MONTH_TOK + r")" + SEP + r"(?:" + DAY + SEP + r")?(" + YR + r")", re.I)
# Rolls to M Y  (period from enlistment)
PD = re.compile(r"Rolls?\s+to\s+(" + MONTH_TOK + r")" + SEP + r"(?:" + DAY + SEP + r")?(" + YR + r")(?=(.{0,60}))", re.I)
# Present to M Y
PE = re.compile(r"\b(Present|Absent)\s+to\s+(" + MONTH_TOK + r")" + SEP + r"(?:" + DAY + SEP + r")?(" + YR + r")", re.I)


def roll_statements(text):
    out = []
    for m in PA.finditer(text):
        m1, y1, m2, y2 = bp.mon(m.group(1)), m.group(2), bp.mon(m.group(3)), year(m.group(4))
        if not (m1 and m2 and y2):
            continue
        y1v = year(y1) if y1 else y2
        if y1v is None:
            y1v = y2
        out.append(((y1v, m1), (y2, m2), bp.first_status(cut_tail(m.group(5))), m.group(0)[:110]))
    for m in PB.finditer(text):
        m1, y2 = bp.mon(m.group(1)), year(m.group(2))
        if m1 and y2:
            out.append(((y2, m1), (y2, m1), bp.first_status(cut_tail(m.group(3))), (m.group(0) + ' ' + cut_tail(m.group(3)))[:110]))     # audit fix B6: keep the status words in the text
    for m in PC.finditer(text):
        st = 'present' if m.group(1).lower().startswith('pres') else 'absent'
        m2, y2 = bp.mon(m.group(4)), year(m.group(5))
        if not (m2 and y2):
            continue
        if m.group(2) and bp.mon(m.group(2)) and year(m.group(3)):
            s0 = (year(m.group(3)), bp.mon(m.group(2)))
        else:
            s0 = (1861, 1)
        out.append((s0, (y2, m2), st, m.group(0)[:110]))
    for m in PD.finditer(text):
        m2, y2 = bp.mon(m.group(1)), year(m.group(2))
        if m2 and y2:
            out.append(((1861, 1), (y2, m2), bp.first_status(cut_tail(m.group(3))), (m.group(0) + ' ' + cut_tail(m.group(3)))[:110]))
    for m in PE.finditer(text):
        m2, y2 = bp.mon(m.group(2)), year(m.group(3))
        if m2 and y2:
            out.append(((1861, 1), (y2, m2), 'present' if m.group(1).lower().startswith('pres') else 'absent', m.group(0)[:110]))
    return out
