"""Company G (Nottoway Grays), 18th Virginia Infantry (Garnett's brigade): Irby, Historical Sketch of the Nottoway Grays (1878),
IA historicalsketc00irbygoog; the 'Condensed Roll' lists every man with county, enlistment and fate. One company only.
Run: python -X utf8 irby18va_parse.py"""
import re, sys, collections
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import *

SID = 'VA-IRBY-1878-COG18-v1'
L = open(CACHE + 'historicalsketc00irbygoog_djvu.txt', encoding='utf-8', errors='replace').read().splitlines()
UID, REGN = 'C-18VA', '18th Virginia Infantry'
START, END = 2081, 2555

SECT = re.compile(r'^\s*(COMMISSIONED OFFICERS|SERGEANTS|CORPORALS|PRIVATES|MUSICIANS|DRUMMERS)\.?\s*$', re.I)
GF = re.compile(r"^\s*[\u2666\*\u2022]?\s*((?:[A-Z][A-Za-z]*\.?\s){0,3}[A-Z][A-Za-z\.\"'\u2019]{1,}),\s+(.*)$")
SF = re.compile(r"^\s*[\u2666\*\u2022]?\s*(?:[A-Za-z](?=[A-Z][a-z]))?([A-Z][a-z]+(?:[A-Z][a-z]+)?),\s+((?:[\"']?[A-Z0-9][A-Za-z0-9\.\"'\u2019]*(?:\s\.)?\s?){0,3}),\s*(.*)$")

rows, cur, sect, prev_end = [], None, 'COMMISSIONED OFFICERS', True
page = None


def flush():
    global cur
    if not cur:
        return
    txt = squash(' '.join(cur['body']).replace('- ', ''))
    c = classify_history(txt, allow_rank_date=False)
    nm = squash(cur['name'])
    fl = name_flags(nm) + c['flags']
    # a man who 'escaped without wounds' is documented present at the battle only when Gettysburg is named; keep rule outcome
    rows.append(dict(regiment=REGN, unit_id=UID, company='G', section=cur['section'].title(), name_as_printed=nm, rank_as_printed=cur['section'].title().rstrip('s'),
                     enlist_or_commission_date=c['enlisted'], residence_or_county=cur['county'], remarks_as_printed=txt, presence_label=c['label'],
                     presence_basis=c['basis'], basis_code=c['basis_code'], dup_group='', source_id=SID, source_locator='condensed roll, book pp.33-38',
                     parse_flags=';'.join(sorted(set(fl))), roll_status=c['roll_status']))
    cur = None


for i in range(START, END):
    ln = L[i]
    s = re.sub(r'\s+', ' ', ln).strip()
    if not s or re.match(r'^[\d\s]{1,5}$', s):
        continue
    m = SECT.match(s)
    if m:
        flush()
        sect = m.group(1).upper()
        prev_end = True
        continue
    if re.match(r'^(CONDENSED ROLL|GINIA REGIMENT|OFFICERS\.?$)', s) or s in ('I',):
        continue
    if len(s) < 10 and ',' not in s and not s.endswith('.') and not re.search(r'[a-z]{4}', s):
        continue        # AUDIT: OCR debris line ('L N. Hs') between two entries must not stop the next entry from being recognised
    new = None
    if sect == 'PRIVATES':
        mm = SF.match(s)
        if mm and (prev_end or re.search(r'(enlisted|joined|transferred)', mm.group(3))):
            new = dict(name=mm.group(1) + ', ' + mm.group(2).strip(' ,'), county='', rest=mm.group(3))
    else:
        mm = GF.match(s)
        if mm and prev_end and len(mm.group(1).split()) <= 4:
            new = dict(name=mm.group(1), county='', rest=mm.group(2))
    if new:
        flush()
        rest = new['rest']
        cty = re.match(r'^([A-Z][a-z]+)(?: county)?\s*[,;]', rest)
        cur = dict(name=new['name'], county=cty.group(1) if cty else '', body=[rest], section=sect)
    elif cur is not None:
        cur['body'].append(s)
    prev_end = bool(re.search(r'[\.\]]\s*$', s)) and not re.search(r'\b(Co|Capt|Lieut|Gen|Col|Sergt|Corpl|St|No)\.$', s)
flush()

# the book prints a man once; a man promoted from the ranks can appear twice (privates and sergeants): mark same-name pairs only
cnt = collections.Counter(re.sub(r'[^a-z]', '', r['name_as_printed'].lower()) for r in rows)
for r in rows:
    if cnt[re.sub(r'[^a-z]', '', r['name_as_printed'].lower())] > 1:
        r['parse_flags'] = (r['parse_flags'] + ';same-name-pair').strip(';')
write_csv(OUT + 'csv/C-18VA.csv', rows)
print(len(rows), dict(collections.Counter(r['presence_label'] for r in rows)), collections.Counter(r['section'] for r in rows))
