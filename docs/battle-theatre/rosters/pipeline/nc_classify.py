import json, re, sys, datetime
sys.path.insert(0, '.')
from common import mon_of, GB_START, GB_END
from collections import Counter

E = json.load(open('../cache/nc26_entries_raw.json'))
SPLIT = re.compile(r"(?<=[\.\,;/•·])\s+(?=[A-Z][A-Za-z'\-\.\^\?]+(?:\s[A-Za-z\.\^]+){0,3},\s+(?:[A-Za-z\.\s'\^\-]{1,32},\s+)?(?:e\.|e,|cm\.|e\s))")
rows = []
HAS_E = re.compile(r"(?<![A-Za-z])(e\.|e,|cm\.)\s")
for e in E:
    txt = re.sub(r"(?<=\s)[■•·/'\"`~^*]{1,2}(?=\s)", ' ', e['text'])
    txt = re.sub(r'\s+', ' ', txt)
    cuts, last = [], 0
    for m in SPLIT.finditer(txt):
        if HAS_E.search(txt[last:m.start()]):
            cuts.append(m.end())
            last = m.end()
    pos = 0
    parts = []
    for c in cuts:
        parts.append(txt[pos:c])
        pos = c
    parts.append(txt[pos:])
    for t in parts:
        rows.append(dict(co=e['co'], sec=e['sec'], text=t.strip(' •·/')))
print('entries after split', len(rows))

MD = re.compile(r"([A-Z][a-z]{2,8})\.?\s*(\d{1,2})?\s*(?:st|nd|rd|th|d)?\s*,?\s*['\"‘’“”`]+\s*([0-9OIlo£]{2})")
RANK = re.compile(r"\b(Colonel|Lieut\.?\s*Col|Major|Captain|Adjutant|Surgeon|Assistant|Sergeant|Corporal|Musician|1st\s+Lieut|2nd\s+Lieut|2d\s+Lieut|3d\s+Lieut|Lieut|A\.\s*Q\.\s*M|A\.\s*C\.\s*S|Q\.\s*M|Ensign|Chaplain|Wagoner)", re.I)


def yr(s):
    s = s.replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1').replace('£', '1')
    try:
        n = int(s)
    except ValueError:
        return None
    if n in (60, 61, 62, 63, 64, 65):
        return 1800 + n
    if n in (1, 2, 3, 4, 5):
        return 1860 + n       # '01 -> 61 OCR: 0 for 6 means the digit after is the unit digit
    return None


def dates(s):
    out = []
    for m in MD.finditer(s):
        mo = mon_of(m.group(1))
        if not mo:
            continue
        y = yr(m.group(3))
        if not y:
            continue
        d = int(m.group(2)) if m.group(2) else 15
        d = min(max(d, 1), 28 if mo == 2 else 30 if mo in (4, 6, 9, 11) else 31)
        out.append((datetime.date(y, mo, d), m.start(), m.end(), m.group(2) is None))
    return out


GETT = re.compile(r'Gett|Get\w{0,4}burg|Gettvs', re.I)
out = []
for r in rows:
    t = re.sub(r'\s+', ' ', r['text'])
    m = re.match(r"^(.+?),\s+(.*)$", t)
    if not m:
        continue
    first, rest = m.group(1), m.group(2)
    # determine name style
    rankm = RANK.search(rest[:60])
    name, rank = None, ''
    if r['sec'] in ('officers', 'nco') and rankm and (' ' in first.strip()) and not re.match(r'^[A-Z][a-z]+$', first):
        name = first
        rank = rest.split(',')[0] if ',' in rest else rest[:20]
        body = rest[len(rest.split(',')[0]) + 1:] if ',' in rest else rest
        style = 'gs'
    elif re.match(r"^[^\s]+$", first) or r['sec'] == 'privates':
        gv = rest.split(',', 1)
        name = (gv[0] + ' ' + first).strip()
        body = gv[1] if len(gv) > 1 else ''
        style = 'sf'
    else:
        name = first
        rank = rest.split(',')[0]
        body = rest[len(rank) + 1:]
        style = 'gs'
    body = body.strip()
    enl = None
    em = re.search(r"\b(e\.|e,|cm\.)\s*(.*?)(;|$)", body)
    dl = dates(body)
    if em:
        ed = dates(em.group(2) if em else '')
        if ed:
            enl = ed[0][0]
    # events
    segs = [s.strip() for s in re.split(r';', body)]
    gb = bool(GETT.search(body))
    sep_before = None
    sep_after = None
    sep_kind = None
    for s in segs:
        k = re.match(r"^(dg|d|k|tr|r|dt|m|c|pr|w|p)\b", s.replace('•', '').strip())
        if not k:
            continue
        kind = k.group(1)
        sd = dates(s)
        if kind in ('d', 'dg', 'k', 'tr', 'r', 'dt') and not GETT.search(s):
            if sd:
                if sd[0][0] < GB_START and sep_before is None:
                    sep_before = (kind, sd[0][0])
                elif sd[0][0] >= GB_START and sep_after is None:
                    sep_after = (kind, sd[0][0])
            else:
                ym = re.search(r"in\s*['‘’`\"]\s*([0-9OIl]{2})", s)
                yy = yr(ym.group(1)) if ym else None
                if yy and yy < 1863 and sep_before is None:
                    sep_before = (kind, datetime.date(yy, 6, 30))
                elif yy and yy > 1863 and sep_after is None:
                    sep_after = (kind, datetime.date(yy, 6, 30))
                else:
                    sep_kind = sep_kind or kind
    # casualty on 1-3 July
    d13 = [d for d, _, _, nd in dl if GB_START <= d <= GB_END]
    if r['sec'] == 'officers' and style == 'gs':
        pass
    if enl and enl >= GB_END:
        lab, why = 'Absent-Documented', f'enlisted {enl} (after the battle) per Moore 1882'
    elif gb and not sep_before:
        lab, why = 'Present-Documented', 'Moore 1882 remark names Gettysburg: ' + body[:80]
    elif d13 and not sep_before:
        lab, why = 'Present-Documented', f'Moore 1882 event dated {d13[0]}'
    elif sep_before:
        lab, why = 'Absent-Documented', f'Moore 1882: {sep_before[0]}. {sep_before[1]} before the battle'
    elif enl is None:
        lab, why = 'Unknown', 'no legible enlistment/commission date'
    elif sep_kind:
        lab, why = 'Unknown', f'separation ({sep_kind}.) recorded without a legible date'
    else:
        lab, why = 'Unknown', 'on roll (enlisted before the battle, no separation before it); Moore gives no June 1863 status'
    out.append(dict(co=r['co'], sec=r['sec'], name=name, rank=rank, style=style, enl=str(enl) if enl else None, body=body, label=lab, why=why))
json.dump(out, open('../cache/nc26_classified.json', 'w'), indent=0)
print(len(out), Counter(o['label'] for o in out))
print(sorted(Counter((o['co']) for o in out if o['label'] != 'Absent-Documented').items()))
