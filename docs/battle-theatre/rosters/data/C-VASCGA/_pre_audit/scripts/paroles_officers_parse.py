"""Officers of Virginia, Georgia and South Carolina regiments on the Appomattox parole lists (Southern Historical Society Papers, vol. XV, 1887;
Brock ed., 'Paroles of the Army of Northern Virginia'), IA cu31924030921773. Only the officers' lists are read here: one man per line with rank, company and
regiment printed on the same line, so the unit is explicit. The enlisted lists are printed in two columns with ditto marks and no per-line regiment;
they are NOT read in this pass (see README, gaps). A parole in April 1865 is a later roll: it says nothing about 1 to 3 July 1863.
Run: python -X utf8 paroles_officers_parse.py"""
import re, sys, collections, json, glob
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import *

SID = 'CS-SHSP15-1887-PAROLES-v1'
L = open(CACHE + 'cu31924030921773_djvu.txt', encoding='utf-8', errors='replace').read().splitlines()
OOB = json.load(open(OUT + 'oob_scope.json'))
IDS = {u['id']: u for u in OOB['units']}
STATE = {'ga': 'GA', 'va': 'Va', 's. c': 'SC', 's.c': 'SC', 's c': 'SC'}
SC_ABBR = {'ga': 'GA', 'va': 'VA', 's. c': 'SC', 's.c': 'SC'}


def ordinal(tok):
    t = tok.lower().strip('.')
    t = re.sub(r'^[il]st$', '1st', t)
    t = re.sub(r'^i(\d)', r'1\1', t)
    t = t.replace('loth', '10th').replace('nth', '11th').replace('gth', '9th').replace('ist', '1st')
    t = re.sub(r'^([0-9]*)l(?=\d|st|d|th)', lambda m: (m.group(1) or '') + '1', t)
    t = re.sub(r'^([3-9]?)g(?=th)', lambda m: (m.group(1) or '') + '9', t)
    t = re.sub(r'^(\d)l(th)$', r'\g<1>1\2', t)
    m = re.match(r'^(\d{1,2})(st|d|nd|rd|th)$', t)
    return int(m.group(1)) if m else None


def unit_for(st, n):
    base = 'C-%d%s' % (n, st)
    for cand in (base, base + '-E', base + '-M'):
        if cand in IDS:
            return cand
    return None


PAT = re.compile(r"^(.{4,40}?),\s+((?:[1-9ig]?[stnd]{1,2}\.?\s+)?(?:Lt|Lieut|Capt|Col|Maj|Surg|Ass|Chap|Adj|Q|Ord|Com|Serg)[A-Za-z\.\s']{0,22}?)[,\.]?\s+(?:Co\.?\s*([A-Z]),?\s*)?([A-Za-z0-9]{2,5})\s+(Ga|Va|S\.\s?C)\.?\s*(Reg'?t?|Inf|Cav|Batt\w*|Art\w*|Vols|Bat|inf)", re.I)
rows, unresolved = [], []
for i, ln in enumerate(L):
    s = re.sub(r'\s+', ' ', ln).strip()
    m = PAT.match(s)
    if not m:
        continue
    nm, rank, co, ordt, stt, kind = m.groups()
    if re.search(r'cav|batt|art|bat', kind, re.I) and not re.search(r"reg|inf|vols", kind, re.I):
        unresolved.append((s, 'cavalry/battery/battalion not mapped in this pass'))
        continue
    n = ordinal(ordt)
    st = SC_ABBR.get(stt.lower().replace(' ', ''), SC_ABBR.get(stt.lower()))
    if st is None or n is None:
        unresolved.append((s, 'ordinal not readable: %r' % ordt))
        continue
    uid = unit_for(st, n)
    if uid is None:
        continue          # a regiment that was not at Gettysburg (not in this family's OOB list)
    nm = squash(nm)
    rows.append(dict(regiment=IDS[uid]['designation'], unit_id=uid, company=(co.upper() if co and co.upper() in 'ABCDEFGHIK' else ('?' if co else 'FS')), section='officers paroled Apr 1865', name_as_printed=nm,
                     rank_as_printed=squash(rank), enlist_or_commission_date='', residence_or_county='', remarks_as_printed=s,
                     presence_label='Unknown',
                     presence_basis='an officer of this regiment on the Appomattox parole list (April 1865): a later roll, no status for 1 to 3 July 1863',
                     basis_code='ONROLL-NO-STATUS', dup_group='', source_id=SID, source_locator='SHSP 15 officers list (djvu text line %d)' % (i + 1),
                     parse_flags=';'.join(name_flags(nm) + (['company-letter-ocr-suspect'] if co and co.upper() not in list('ABCDEFGHIK') else []) + (['ordinal-ocr-corrected'] if not re.fullmatch(r'\d+(st|d|nd|rd|th)', ordt.lower()) else [])),
                     roll_status='on-roll-undetermined'))
by = collections.defaultdict(list)
for r in rows:
    by[r['unit_id']].append(r)
for uid, rs in by.items():
    write_csv(OUT + 'csv/%s.paroles-officers.csv' % uid, rs)
json.dump([dict(line=a, reason=b) for a, b in unresolved], open(OUT + 'paroles_officers_unresolved.json', 'w'), indent=0)
print(len(rows), 'rows in', len(by), 'units;', len(unresolved), 'unresolved lines')
print({k: len(v) for k, v in sorted(by.items())})
