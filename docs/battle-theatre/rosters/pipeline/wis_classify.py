import json, re, sys, datetime, difflib
sys.path.insert(0, '.')
from common import *
from collections import Counter

recs = json.load(open('../cache/wis6_records.json'))
KW = re.compile(r'(Disch|Died|Dicd|Killed|Kill\W?d|Desert|Deser|Trans|Res\b|Resign|Dismiss|M\.\s*O\b|Mustered)', re.I)
SEPKW = re.compile(r'^(Disch|Died|Killed|Deserted|Trans|Resigned|Dismissed)$', re.I)
KWS = ['Disch','Died','Killed','Deserted','Trans','Resigned','Dismissed','Detached','Mustered']

# Line officers present at Gettysburg, per Dawes (1890), footnote to the chapter 'The Sixth Wisconsin at Gettysburg': (company, surname)
DAWES_PRESENT = {('pruyn', 'h'), ('huntington', 'h'), ('converse', 'r'), ('converse', 'j'), ('hyatt', 'c'), ('harris', 'l'), ('chapman', 'o'),
                 ('kerr', 't'), ('marston', 'j'), ('mangan', 'm'), ('mangen', 'm'), ('graetz', 'o'), ('goltermann', 'w'), ('timmons', 'j'),
                 ('beeley', 'j'), ('beely', 'j'), ('merchant', 'e'), ('rogers', 'e'), ('ticknor', 'j'), ('remington', 'w'), ('campbell', 'w'),
                 ('dawes', 'r')}
out = []
for r in recs:
    nm = r['name']
    nm = re.sub(r'(\s*[\.·,]\s*)+$', '', nm.strip())
    nm = re.sub(r'(\s\.)+', ' ', nm).strip(' .,')
    nm = re.sub(r'\s+', ' ', nm)
    rem = re.sub(r'\s+', ' ', r['rem']).strip()
    date = r['date']
    enl = parse_dates(date)
    enl_d = enl[0][0] if enl else None
    is_officer = r['section'] == 'officers' or r['company'] == 'FS' and r['section'] != 'enlisted'
    if is_officer:
        enl_d = None          # the Date column of the officer tables is 'Rank from', not enlistment
    if is_officer or enl_d is None:
        m = re.search(r'Enl\.?\s*(.*?)(;|$)', rem)
        if m:
            e2 = parse_dates(m.group(1))
            if e2:
                enl_d = e2[0][0]
    # events: split remarks on ; or : and fuzzy-match each segment's first word
    events = []
    for seg in re.split(r'[;:]', rem):
        seg = seg.strip(' .*')
        w = re.sub(r'[^A-Za-z]', '', seg.split(' ')[0]) if seg else ''
        if not w:
            continue
        best = None
        if w.lower().startswith('res'):
            best = (1.0, 'Resigned')
        for kw in KWS:
            rt = difflib.SequenceMatcher(None, w.lower(), kw.lower()).ratio()
            if rt >= 0.66 and (best is None or rt > best[0]):
                best = (rt, kw)
        if best:
            pd = parse_dates(seg)
            events.append((best[1], pd[0][0] if pd else None))
    gett = bool(re.search(r'[GC]ett|ettysb|Gcttys|Gettvs|Get\w*sb', rem, re.I))
    rd = parse_dates(rem)
    d13 = [d for d, _, _ in rd if GB_START <= d <= GB_END]
    sep_before = None
    sep_unreadable = None
    for kw, d in events:
        if SEPKW.match(kw):
            if d is not None and d < GB_START:
                sep_before = (kw, d)
                break
            if d is None:
                sep_unreadable = sep_unreadable or kw
    xref = bool(re.match(r'^(See|Same as)\b', rem))
    drafted = bool(re.search(r'Dra[fl][tl]', rem))
    note = ''
    if enl_d and ((enl_d.year == 1861 and enl_d.month < 4) or enl_d.year < 1861):
        enl_d = None
        note = 'OCR year implausible'
    if xref:
        label, why = 'Duplicate-Xref', 'cross-reference row: ' + rem[:60]
    elif drafted and not (gett or d13):
        label, why = 'Absent-Documented', 'Drafted: the 6th Wis received draftees only in Sept-Nov 1864 (all legible Drafted rows are 1864-65); OCR year unreliable'
    elif enl_d and enl_d >= GB_START:
        label, why = 'Absent-Documented', f'enlisted/rank date {enl_d} is after the battle'
    elif gett and not sep_before:
        label, why = 'Present-Documented', 'roster remark names Gettysburg: ' + rem[:80]
    elif d13 and not sep_before:
        label, why = 'Present-Documented', f'event dated {d13[0]} in remarks'
    elif sep_before:
        label, why = 'Absent-Documented', f'{sep_before[0]} dated {sep_before[1]} (before the battle)'
    elif sep_unreadable:
        label, why = 'Unknown', f'"{sep_unreadable}" event present but its date is not legible in the OCR layer'
    elif enl_d is None and re.search(r'\bVet\b|Ver\.', rem):
        label, why = 'Unknown', 'ON-ROLL-UNDETERMINED: enlistment year lost to OCR; Vet. (re-enlisted Jan 1864) implies service before the battle; no earlier separation'
    elif enl_d is None and re.search(r'term\s*exp', rem, re.I):
        label, why = 'Unknown', 'ON-ROLL-UNDETERMINED: enlistment year lost to OCR; muster-out by term expiry in 1864 implies 1861 enlistment; no earlier separation'
    elif enl_d is None:
        label, why = 'Unknown', 'enlistment year not recoverable from OCR layer; needs image check or muster roll'
    else:
        label, why = 'Unknown', 'ON-ROLL-UNDETERMINED: on roll before battle; no separation dated before 1 Jul 1863 in remarks (roster has no June 1863 muster status)'
    if gett and label == 'Absent-Documented' and not xref:
        label, why = 'Present-Documented', 'roster remark names Gettysburg; the apparent before-battle date is an OCR year misread (CONFLICT flagged): ' + rem[:70]
    toks = [t for t in re.sub(r'[^A-Za-z ]', ' ', nm.split(',')[0] if ',' in nm else nm).split() if t]
    sur = toks[-1].lower() if toks else ''
    ini = toks[0][0].lower() if toks else ''
    if is_officer and (sur, ini) in DAWES_PRESENT and label != 'Present-Documented':
        label, why = 'Present-Documented', 'named in Dawes 1890 (Service with the Sixth Wisconsin, Gettysburg chapter, footnote) list of line officers present at Gettysburg (company there may differ from the later company of this roster row)'
    if is_officer and re.match(r'^Edward\s+S\.?\s+Bra', nm):
        label, why = 'Absent-Documented', 'Dawes 1890: Colonel Bragg was sick and away in June 1863 and rejoined on 8-9 July; Dawes commanded on 1 July'
    out.append(dict(co=r['company'], sec=r['section'], name_raw=r['name'], name=nm,
                    res=re.sub(r'\s+', ' ', r['res']).strip(' .,'), date_raw=date,
                    enl=str(enl_d) if enl_d else None, remarks=rem, label=label, why=why, page=r['page']))
json.dump(out, open('../cache/wis6_classified.json', 'w'), indent=0)
print(len(out), Counter(o['label'] for o in out))
