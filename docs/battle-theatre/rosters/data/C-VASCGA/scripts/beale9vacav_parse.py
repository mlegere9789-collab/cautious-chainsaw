"""9th Virginia Cavalry (Chambliss/W.H.F. Lee brigade, Stuart's cavalry): Beale, History of the Ninth Virginia Cavalry (1899), IA historyofninthvi00beal.
The 'Roster' prints names with rank and a later note ('Dead', 'Cannot be located'); it gives no service dates, so no per-man status for 1863.
Companies printed in the volume: A to K (company K's heading is OCR'd 'ROLL OP COMPANY K'; AUDIT 2026-10-30 fixed the pattern, before that the 100-odd men of K
were read as company I) plus the field and staff list (AUDIT: added; it had been skipped). Run: python -X utf8 beale9vacav_parse.py"""
import re, sys, collections
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import *

SID = 'VA-BEALE-1899-9VACAV-v1'
L = open(CACHE + 'historyofninthvi00beal_djvu.txt', encoding='utf-8', errors='replace').read().splitlines()
UID, REGN = 'C-9VA-CAV', '9th Virginia Cavalry'
rows = []
comp = 'FS'
cur = None
NAME = re.compile(r"^([A-Z][A-Za-z'\u2019\-]+(?:\s[A-Z][a-z]+)?),\s+((?:[A-Z][A-Za-z\.]*\s?){1,4}?)(?:\s{2,}|\s)?((?:Captain|First\s+Lieutenant|Second\s+Lieutenant|Third\s+Lieutenant|[A-Z][a-z]+(?:-[A-Z][a-z]+)?\s+Sergeant|[A-Z][a-z]+\s+Corporal|Quartermaster-Sergeant|Bugler|Blacksmith|Farrier|Surgeon|Private)?)\.?\s*$")
page = None
start = None
for i, ln in enumerate(L):
    if re.search(r'^ROLL\s+OF\s+COMPANY\s+[A-K]', ln.strip()) and start is None:
        start = i
if start is None:
    raise SystemExit('roster start not found')
end = len(L)
for i in range(start + 50, len(L)):
    if re.match(r'^\s*(INDEX|CONTENTS|APPENDIX)\b', L[i]):
        end = i
        break


RANKTAIL = re.compile(r'\s+((?:First|Second|Third|Fourth|Fifth)\s+(?:Lieutenant|Sergeant|Corporal)|Captain|Lieutenant|Quartermaster-Sergeant|Quartermaster|Sergeant|Corporal|Bugler|Blacksmith|Farrier|Surgeon|Private)\.?$')


def push(nm, rank, c):
    nm = squash(nm)
    mt = RANKTAIL.search(nm)
    if mt:
        rank = (mt.group(1) + ' ' + rank).strip()
        nm = nm[:mt.start()]
    rows.append(dict(regiment=REGN, unit_id=UID, company=c, section='roster', name_as_printed=nm, rank_as_printed=rank, enlist_or_commission_date='',
                     residence_or_county='', remarks_as_printed='', presence_label='Unknown',
                     presence_basis='printed on the 1899 regimental roster of the 9th Virginia Cavalry, company %s; the roster gives no dates and no status for 1 to 3 July 1863' % c,
                     basis_code='ONROLL-NO-STATUS', dup_group='', source_id=SID, source_locator='roster, book pp.149 ff.', parse_flags=';'.join(name_flags(nm)),
                     roll_status='on-roll-undetermined'))


# AUDIT 2026-10-30: field and staff officers and staff (book pp.149-150), one row per man per office held; a man printed under several offices is carried once
# (later entries are Duplicate-Xref). No dates of service in the regiment are printed except the tenure of some offices.
FS_RE = re.compile(r"^((?:First|Second|Third|Fourth|Fifth)\s+)?(Lieutenant-Colonel|Colonel|Major|Adjutant|Surgeon|Assistant Surgeons|Quartermasters|Commissaries|Sergeant-Majors|Clerk to Adjutant|Ordnance Sergeant|Quartermaster's Sergeant|Color-Bearers|Regimental Bugler|Postmaster|Chaplains|Blacksmith)\s+(.+)$")
fs_start = next(i for i, ln in enumerate(L) if re.sub(r'\s+', ' ', ln).strip() == 'FIELD AND STAFF OFFICERS.')
fs_end = next(i for i in range(fs_start, len(L)) if re.match(r'^ROLL\s+OF\s+COMPANY\s+A', re.sub(r'\s+', ' ', L[i]).strip()))
fs_rows, last_office, seen_fs = [], None, {}
for i in range(fs_start + 1, fs_end):
    s = re.sub(r'\s+', ' ', L[i]).strip()
    if not s or re.match(r'^(\[\d+\]|.{0,6}Roster of)', s):
        continue
    m = FS_RE.match(s)
    if m:
        office = ((m.group(1) or '') + m.group(2)).strip()
        names = [n.strip(' .,') for n in re.split(r',\s+and\s+|\s+and\s+|,\s*(?=[A-Z][a-z]*\.?\s)', m.group(3).strip()) if n.strip(' .,')]
        last_office = office
        for nm in names:
            fs_rows.append(dict(name=nm, office=office, line=i + 1, tenure=''))
    elif re.match(r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,? 18\d\d', s) and fs_rows:
        fs_rows[-1]['tenure'] = s.strip(' .')
    elif last_office and re.match(r"^[A-Z][A-Za-z\.' ]+(,\s+(and\s+)?[A-Z][A-Za-z\.' ]+)*\.?$", s):
        for nm in [n.strip(' .,') for n in re.split(r',\s+and\s+|\s+and\s+|,\s*', s) if n.strip(' .,')]:
            fs_rows.append(dict(name=nm, office=last_office, line=i + 1, tenure=''))
for fr in fs_rows:
    nm = squash(fr['name'])
    key = re.sub(r'[^a-z]', '', nm.lower().split()[-1]) + '|' + re.sub(r'[^a-z]', '', nm.lower())[:1]
    first = seen_fs.get(key)
    rows.append(dict(regiment=REGN, unit_id=UID, company='FS', section='field and staff', name_as_printed=nm, rank_as_printed=fr['office'], enlist_or_commission_date='',
                     residence_or_county='', remarks_as_printed=('tenure of this office printed: ' + fr['tenure']) if fr['tenure'] else '',
                     presence_label='Duplicate-Xref' if first else 'Unknown',
                     presence_basis=('cross-reference: the same man is printed under another office of the field and staff list' if first else
                                     'printed on the 1899 field and staff list of the 9th Virginia Cavalry; no status for 1 to 3 July 1863 (the tenure of an office is not a separation from the regiment)'),
                     basis_code='DUP-XREF' if first else 'ONROLL-NO-STATUS', dup_group=('b9fs-' + key) if first else '', source_id=SID,
                     source_locator='roster, field and staff list, book pp.149-150 (djvu text line %d)' % fr['line'], parse_flags=';'.join(name_flags(nm)),
                     roll_status='xref' if first else 'on-roll-undetermined'))
    if first:
        first['dup_group'] = 'b9fs-' + key
    else:
        seen_fs[key] = rows[-1]

for i in range(start, end):
    s = re.sub(r'\s+', ' ', L[i]).strip()
    if not s:
        continue
    m = re.match(r'^ROLL O[FP] COMPANY ([A-K])', s)
    if m:
        comp = m.group(1)
        continue
    if re.match(r'^(Dead|JJead|Died)\.?$', s, re.I) and rows:
        rows[-1]['remarks_as_printed'] = 'later note on the roster: Dead'
        continue
    if re.match(r'^Cannot be located\.?$', s) and rows:
        rows[-1]['remarks_as_printed'] = 'later note on the roster: Cannot be located'
        continue
    m = re.match(r"^([A-Z][A-Za-z'\u2019\-]+(?: [A-Z][a-z]+)?),\s+((?:[A-Z][A-Za-z\.]*\s?){1,4})(.*)$", s)
    if m and len(s) < 70 and not re.search(r'\b(the|and|was|were|for|his|that)\b', s):
        rank = squash(m.group(3))
        push(m.group(1) + ', ' + m.group(2).strip(), rank, comp)

# the roster prints some names twice (two columns of one page overlap in the OCR); keep order, drop exact repeats on the same company only when adjacent
out = []
for r in rows:
    if out and out[-1]['name_as_printed'] == r['name_as_printed'] and out[-1]['company'] == r['company']:
        continue
    out.append(r)
write_csv(OUT + 'csv/C-9VA-CAV.csv', out)
print(len(out), collections.Counter(r['company'] for r in out))
