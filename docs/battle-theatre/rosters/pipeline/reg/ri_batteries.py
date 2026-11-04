"""Battery A (Aldrich 1904 appendix) and Battery B (Rhodes 1894 roster) of the 1st Rhode Island Light Artillery."""
import re, os, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from reg_common import *
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
C = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'REG')
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'REG')


def label(rem):
    din = None
    m = re.search(r'(Mustered|Enrolled|Enlisted|Commissioned|Drafted)[^;]{0,40}?([A-Z][a-z]{2,8}\.? \d{1,2},? ?\d{4}|[A-Z][a-z]{2,8}\.? ?\d{1,2},? ?18\w\w)', rem)
    ds = parse_dates(rem)
    if m:
        d2 = parse_dates(m.group(0))
        if d2:
            din = d2[0][0]
    if din is None and ds:
        din = ds[0][0]
    if (GETT.search(rem) and CAS.search(rem)) or gb_casualty(rem):
        return din, 'Present-Documented', 'CAS-REMARK: remark names Gettysburg with a casualty event', 'named-present', ''
    sep, cl = clause_sep(rem)
    if sep and sep < GB_START:
        fl = 'transferred-to-other-unit' if re.search(r'trans\w*\.?\s+to', cl, re.I) else ''
        return din, 'Absent-Documented', 'SEP-BEFORE: separation from the battery dated %s, before 1 July 1863' % sep.isoformat(), 'off-roll-before-battle', fl
    if din and din > GB_END:
        return din, 'Absent-Documented', 'ENL-AFTER: mustered/enrolled %s' % din.isoformat(), 'not-yet-enlisted', ''
    if GETT.search(rem):
        return din, 'Unknown', 'remark mentions Gettysburg without a casualty word: check page image', 'unreadable-or-ambiguous', ''
    if din is None:
        return din, 'Unknown', 'no legible muster date in the entry', 'unreadable-or-ambiguous', ''
    return din, 'Unknown', 'ONROLL-NO-STATUS: on the roll before the battle, no separation before it; the source gives no status for 30 June 1863', 'on-roll-undetermined', ''


def batt_b():
    L = open(os.path.join(C, 'historyofbattery03rhod_djvu.txt'), encoding='utf-8', errors='replace').read().split('\n')[17333:18964]
    entries = []
    sect = 'Captains'
    cur = None
    start = re.compile(r"^((?:[A-Z][a-zA-Z'\-]+|[A-Z]\.)(?: (?:[A-Z][a-zA-Z'\-]+|[A-Z]\.|[A-Z][a-z]+,? or [A-Z][a-z]+)){1,4})\.\s+(?=[A-Z])")
    start2 = re.compile(r"^([A-Z][a-zA-Z'\-]+, [A-Z][a-zA-Z'\-\.]*(?: [A-Z][a-zA-Z'\.\-]*){0,3})\.\s+(?=[A-Z])")
    SECT = {'Captains.': 'Captains', 'First Lieutenants.': 'First Lieutenants', 'Second Lieutenants.': 'Second Lieutenants', 'Sergeants.': 'Sergeants',
            'Corporals.': 'Corporals', 'Buglers.': 'Buglers', 'Artificers.': 'Artificers', 'Privates.': 'Privates',
            'Quartermaster-Sergeants.': 'QM Sergeants', 'First Sergeants.': 'First Sergeants'}
    for ln in L:
        t = re.sub(r'\s+', ' ', ln.strip())
        if not t:
            continue
        if t in SECT:
            sect = SECT[t]
            cur = None
            continue
        if re.match(r'^(FIRST RHODE ISLAND LIGHT ARTILLERY|HISTORY OF BATTERY B)', t) or re.match(r'^\d{3}\s+HISTORY OF BATTERY', t):
            continue
        m = start.match(t) or start2.match(t)
        if m and not re.match(r'^(Company|Battery|Rhode|Fort|Camp|Mustered|Transferred)\b', t):
            cur = dict(name=m.group(1), text=t[m.end():], sect=sect)
            entries.append(cur)
        elif cur is not None:
            cur['text'] += ' ' + t
    rows = []
    for e in entries:
        text = e['text'].replace('- ', '')
        din, lab, basis, rs, fl = label(text)
        if re.match(r'^See ', text):
            lab, basis, rs, fl = 'Duplicate-Xref', 'cross-reference to the same man listed under a higher rank in this roster', 'xref', 'xref-row'
        rows.append(dict(unit_id='U-ART-B1RI', regiment='Battery B, 1st Rhode Island Light Artillery', company='B', section=e['sect'], name_as_printed=e['name'],
                         rank_as_printed=e['sect'], residence='', age='', date_in=din.isoformat() if din else '', date_out='', remarks_as_printed=text,
                         presence_label=lab, presence_basis=basis, roll_status=rs, source_id='RI-BATB-1894',
                         source_locator='IA historyofbattery03rhod djvu text roster (book pp.351-390)', parse_flags=fl))
    return rows


def batt_a():
    L = open(os.path.join(C, 'histbattery00aldrrich_djvu.txt'), encoding='utf-8', errors='replace').read().split('\n')[16888:18056]
    sect = 'Commissioned officers'
    cur = None
    entries = []
    start = re.compile(r"^([A-Z0-9'/;:|()\-\.]{3,}(?: [A-Z0-9'/;:|()\-\.]{1,}){0,2}[,.]\s+[A-Z][A-Za-z'\.\-/ ]{0,35}?)\.\s+(?=[A-Z][a-z])")
    for ln in L:
        t = re.sub(r'\s+', ' ', ln.strip())
        if not t:
            continue
        if t.startswith('RECORD OF THE ORIGINAL'):
            sect = 'Original members not returning'
            cur = None
            continue
        if t.startswith('RECRUITS FOR BATTERY'):
            sect = 'Recruits'
            cur = None
            continue
        if t.startswith('ATTACHED MEN FROM THE SECOND RHODE'):
            sect = 'Attached from 2nd RI Infantry'
            cur = None
            continue
        if t.startswith('ATTACHED MEN SERVING'):
            sect = 'Attached from other regiments'
            cur = None
            continue
        if t.startswith('LIST OF KILLED'):
            sect = 'Killed list'
            cur = None
            continue
        if re.match(r'^(APPENDIX|BATTERY A, FIRST|\d{3}\b)', t) or t.startswith('COMMISSIONED OFFICERS ASSIGNED'):
            continue
        if sect == 'Killed list' and re.search(r'RETURN TO|UNIVERSITY OF CALIFORNIA|LIBRARY', t):
            break
        m = start.match(t)
        if m:
            cur = dict(name=m.group(1), text=t[m.end():], sect=sect)
            entries.append(cur)
        elif cur is not None:
            cur['text'] += ' ' + t
    rows = []
    for e in entries:
        text = e['text'].replace('- ', '')
        din, lab, basis, rs, fl = label(text)
        rows.append(dict(unit_id='U-ART-A1RI', regiment='Battery A, 1st Rhode Island Light Artillery', company='A', section=e['sect'], name_as_printed=e['name'],
                         rank_as_printed='', residence='', age='', date_in=din.isoformat() if din else '', date_out='', remarks_as_printed=text,
                         presence_label=lab, presence_basis=basis, roll_status=rs, source_id='RI-BATA-1904',
                         source_locator='IA histbattery00aldrrich djvu text appendix (book pp.390-407)',
                         parse_flags=(fl + ';' if fl else '') + 'partial-source: appendix lists officers, members who did not return with the battery in June 1864, recruits, attached men and the killed; original members who returned are not listed'))
    return rows


if __name__ == '__main__':
    for fn, rows in (('u-art-b1ri', batt_b()), ('u-art-a1ri', batt_a())):
        write_csv(os.path.join(OUT, fn + '.csv'), rows)
        print(fn, len(rows), dict(collections.Counter(r['presence_label'] for r in rows)), dict(collections.Counter(r['roll_status'] for r in rows)), dict(collections.Counter(r['section'] for r in rows)))
