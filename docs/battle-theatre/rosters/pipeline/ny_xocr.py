"""NY: second, independent OCR reading for the 75th-80th Infantry Registers (IA item annualreportadj02unkngoog, Google OCR of the 1902 Register volume).
The museum PDFs carry an ABBYY FineReader 9 text layer (2010); the Internet Archive item carries Google's OCR of a different scan of the same printed pages,
so agreement between the two is an independent check of names, dates and labels for these four regiments (U-76NY, U-77NY, U-78NY, U-80NY).
Python 3.11 stdlib only; run with -I -X utf8."""
import os, re, collections, difflib, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from ny_register import *

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
IA_TXT = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'NY', 'annualreportadj02unkngoog_djvu.txt')
SECTION = {'FIFTH': 'U-75NY', 'SIXTH': 'U-76NY', 'SEVENTH': 'U-77NY', 'EIGHTH': 'U-78NY', 'NINTH': 'U-79NY', 'EIGHTIETH': 'U-80NY'}


def sections():
    t = open(IA_TXT, encoding='utf-8', errors='replace').read()
    t = re.sub(r'[ \t]+', ' ', t)
    pos = []
    for m in re.finditer(r'(?m)^\s*(?:\d+\s+)?([A-Z\-\' ]{2,25}?)\s+INFANTRY\.?\s*(?:\d+)?\s*$', t):
        w = m.group(1).upper()
        key = None
        for k in ('EIGHTIETH', 'FIFTH', 'FIPTH', 'SIXTH', 'BIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'NIXTH'):
            if k in w:
                key = {'FIPTH': 'FIFTH', 'BIXTH': 'SIXTH', 'NIXTH': 'NINTH'}.get(k, k)
                break
        if key is None and re.search(r'(SNTY|NTY|ENTY|VENTY)[\- ]?SEVEN', w):
            key = 'SEVENTH'
        if key is None and re.search(r'(NTY|ENTY|VENTY)[\- ]?(SIX|SIXT)', w):
            key = 'SIXTH'
        if key is None and re.search(r'EVENTY[\- ]?EIGH|ENTY[\- ]?EIGH', w):
            key = 'EIGHTH'
        if key:
            pos.append((m.start(), key))
    out = collections.defaultdict(list)
    for i, (p, key) in enumerate(pos):
        e = pos[i + 1][0] if i + 1 < len(pos) else len(t)
        out[SECTION[key]].append(t[p:e])
    return {k: '\n'.join(v) for k, v in out.items()}


def readings(unit_id):
    sec = sections().get(unit_id)
    if not sec:
        return []
    ents = split_stream('⟦p0⟧\n' + sec)
    res = []
    for e in ents:
        if e['xref']:
            continue
        p = parse_body(e['body'])
        label, rs, code, basis, flags = classify(p)
        res.append(dict(surname=e['surname'], given=e['given'], company=p['company'] or '', ent=(p['transfer_in'] or p['mustered'] or p['enlisted']), label=label, code=code, body=e['body']))
    return res


def _n(s):
    return re.sub(r'[^a-z]', '', s.lower())


def key_of(surname, given, company, ent):
    return (_n(surname), _n(given)[:3], company or '', ent.isoformat() if ent else '')


def compare(rows, readings_list):
    """rows: museum-text rows (dicts, CSV schema). Pairs each row with one second reading (strict key first, then looser keys, only 1:1 groups)
    and annotates the row in place. Returns counts."""
    import datetime
    from collections import defaultdict
    mu_rows = []
    for r in rows:
        if r['section'] in ('xref', 'roll-of-honor-only'):
            continue
        sn, gv = (r['name_as_printed'].split(', ', 1) + [''])[:2]
        ent = datetime.date.fromisoformat(r['enlisted_or_mustered']) if r['enlisted_or_mustered'] else None
        mu_rows.append((r, sn, gv, r['company'], ent))
    ia_rows = [(o, o['surname'], o['given'], o['company'], o['ent']) for o in readings_list]
    levels = [lambda sn, gv, co, ent: key_of(sn, gv, co, ent),
              lambda sn, gv, co, ent: (_n(sn), _n(gv)[:3], co or ''),
              lambda sn, gv, co, ent: (_n(sn), _n(gv)[:3])]
    pairs = []
    mu_left, ia_left = mu_rows, ia_rows
    for kf in levels:
        d1, d2 = defaultdict(list), defaultdict(list)
        for t in mu_left:
            d1[kf(*t[1:])].append(t)
        for t in ia_left:
            d2[kf(*t[1:])].append(t)
        used1, used2 = set(), set()
        for k, l1 in d1.items():
            l2 = d2.get(k)
            if l2 and len(l1) == 1 and len(l2) == 1:
                pairs.append((l1[0][0], l2[0][0]))
                used1.add(id(l1[0][0]))
                used2.add(id(l2[0][0]))
        mu_left = [t for t in mu_left if id(t[0]) not in used1]
        ia_left = [t for t in ia_left if id(t[0]) not in used2]
    st = collections.Counter()
    st['no_second_reading'] = len(mu_left)
    for t in mu_left:
        r = t[0]
        r['parse_flags'] = (r['parse_flags'] + '|' if r['parse_flags'] else '') + 'second-ocr-no-match'
    for r, o in pairs:
        note = 'IA-Google-OCR (annualreportadj02unkngoog) reading: %s %s' % (o['label'], o['code'])
        r['cross_source'] = (r['cross_source'] + ' || ' if r['cross_source'] else '') + note
        if o['label'] == r['presence_label']:
            st['agree'] += 1
            r['parse_flags'] = (r['parse_flags'] + '|' if r['parse_flags'] else '') + 'second-ocr-agrees'
        elif 'Unknown' in (o['label'], r['presence_label']):
            st['soft_disagree'] += 1  # one reading has no evidence where the other has: kept, flagged
            r['parse_flags'] = (r['parse_flags'] + '|' if r['parse_flags'] else '') + 'second-ocr-soft-disagrees'
        else:
            st['hard_disagree'] += 1  # Present against Absent: carried as a conflict, not resolved
            r['parse_flags'] = (r['parse_flags'] + '|' if r['parse_flags'] else '') + 'second-ocr-hard-disagrees|contested'
            r['presence_basis'] = 'CONFLICT between two OCR readings of the same page (museum ABBYY: %s %s; IA Google: %s %s); first reading: %s' % (r['presence_label'], r['basis_code'], o['label'], o['code'], r['presence_basis'])
            r['presence_label'] = 'Unknown'
            r['roll_status'] = 'contested'
            r['basis_code'] = 'OCR-CONFLICT'
    st['paired'] = len(pairs)
    st['second_reading_unpaired'] = len(ia_left)
    return dict(st)
