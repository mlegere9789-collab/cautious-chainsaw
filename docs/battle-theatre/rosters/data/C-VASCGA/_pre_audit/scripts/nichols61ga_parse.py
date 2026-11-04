"""61st Georgia (Lawton-Gordon-Evans brigade): Nichols, A Soldier's Story of His Regiment (61st Georgia) (1898), IA 01494987.3402.emory.edu.
'Roster of Companies' B to K: 'Surname, Initials; fate' (officers 'Captain X; ...'). Company A has no roster in the book (only a list of its men who
surrendered at Appomattox). Run: python -X utf8 nichols61ga_parse.py"""
import re, sys, collections
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import *

SID = 'GA-NICHOLS-1898-61GA-v1'
UID, REGN = 'C-61GA', '61st Georgia Infantry'
L = open(CACHE + '01494987.3402.emory.edu_djvu.txt', encoding='utf-8', errors='replace').read().splitlines()
START, END = 10052, 12474
OFF = re.compile(r"^(Captain|First\s+Lieutenant|Second\s+Lieutenant|Third\s+Lieutenant|Lieutenant|Colonel|Major|Adjutant|Surgeon)\s+([A-Z][A-Za-z\.\s']+?)\s*[;,]\s*(.*)$")
PRIV = re.compile(r"^([A-Z][A-Za-z'\u2019\-]+(?:\s[A-Z][a-z]+)?),\s+([A-Z][A-Za-z\.\s'\-]{0,24}?)\s*[;,]\s*(.*)$")
rows, cur, comp, prev_end = [], None, '?', True


def flush():
    global cur
    if not cur:
        return
    txt = squash(' '.join(cur['body']).replace('- ', ''))
    c = classify_history(txt, allow_rank_date=False)
    nm = squash(cur['name'])
    fl = name_flags(nm) + c['flags']
    basis = c['basis']
    if c['basis_code'] == 'ONROLL-NO-STATUS':
        basis = 'on the 1898 company roster (compiled from memory and records of survivors); no separation dated before 1 July 1863, no Gettysburg remark; no status for 30 June 1863'
    rows.append(dict(regiment=REGN, unit_id=UID, company=comp_of(cur), section='roster', name_as_printed=nm, rank_as_printed=cur['rank'],
                     enlist_or_commission_date='', residence_or_county='', remarks_as_printed=txt, presence_label=c['label'], presence_basis=basis,
                     basis_code=c['basis_code'], dup_group='', source_id=SID, source_locator='book roster of companies (leaf text line %d)' % cur['line'],
                     parse_flags=';'.join(sorted(set(fl))), roll_status=c['roll_status']))
    cur = None


def comp_of(c):
    return c['comp']


for i in range(START - 1, END):
    s = re.sub(r'\s+', ' ', L[i]).strip()
    if not s or re.match(r'^\d{1,3}$', s):
        continue
    m = re.match(r'^COMPANY ([A-K])\.?$', s)
    if m:
        flush()
        comp = m.group(1)
        prev_end = True
        continue
    if re.match(r'^(ROSTER OF COMPANIES|OF|THE SIXTY-FIRST GEORGIA REGIMENT\.?|From .*County.*|To April.*)$', s, re.I):
        continue
    mo = OFF.match(s) if prev_end else None
    mp = PRIV.match(s) if prev_end else None
    if mo and mo.group(1) and len(mo.group(2).split()) <= 4:
        flush()
        cur = dict(name=mo.group(2), rank=mo.group(1), body=[mo.group(3)], comp=comp, line=i + 1)
    elif mp:
        flush()
        cur = dict(name=mp.group(1) + ', ' + mp.group(2).strip(' .'), rank='', body=[mp.group(3)], comp=comp, line=i + 1)
        if re.match(r'^(corporal|sergeant|lieutenant)', mp.group(3), re.I):
            pass
    elif cur is not None:
        cur['body'].append(s)
    prev_end = bool(re.search(r'[\.\?]\s*$', s)) or s.endswith('living')
flush()
write_csv(OUT + 'csv/C-61GA.csv', rows)
print(len(rows), dict(collections.Counter(r['presence_label'] for r in rows)), dict(collections.Counter(r['company'] for r in rows)))
