"""Page's Battery, or Morris Artillery (Virginia; Second Corps artillery, OOB C-ART-Page): Page, Sketch of Page's Battery (1885), IA sketchofpagesbat00page.
Every man has a numbered entry in a fixed form (age, date and place of enlistment, wounds, captures, transfers, surrender, later life).
Run: python -X utf8 page_battery_parse.py"""
import re, sys, collections
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import *

SID = 'VA-PAGE-1885-PAGEBATTERY-v1'
UID, REGN = 'C-ART-Page', "Page's Battery (Morris Artillery VA)"
L = open(CACHE + 'sketchofpagesbat00page_djvu.txt', encoding='utf-8', errors='replace').read().splitlines()
START = 561
HEAD = re.compile(r"^\s*(\d+\s+)?(PAGE'S\s+BATTERY|PRIVATES|NON-COMMISSIONED\s+OFFI\w*|ARTIFICERS|COMMISSIONED\s+OFF\w*|NON-COMMISSIONED\s+OFFICE\W*\w*)[\.\s\d]*$", re.I)
OFFS = re.compile(r"^(Captain|Senior\s+First\s+Lieutenant|Junior\s+First\s+Lieutenant|First\s+Lieutenant|Second\s+Lieutenant|Senior\s+Second\s+Lieutenant|Junior\s+Second\s+Lieutenant|Lieutenant|Orderly\s+Sergeant|First\s+Sergeant|Sergeant|Corporal|Quartermaster|Surgeon),\s+([A-Z][A-Za-z\.\s']+?)\.\s+(.*)$")
NUM = re.compile(r"^([0-9A-Z]{1,3})\.\s+([A-Z][A-Za-z'\u2019\-]+(?:\s[A-Z][a-z]+)?),\s+([A-Z][A-Za-z\.\s'\-]{0,30}?)\.\s+(.*)$")
entries, cur, sect = [], None, 'COMMISSIONED OFFICERS'
for i in range(START - 1, len(L)):
    s = re.sub(r'\s+', ' ', L[i]).strip()
    if not s:
        continue
    if HEAD.match(s):
        if re.match(r'^(NON|ARTIF|PRIVATES|COMMISSIONED)', s, re.I):
            sect = re.sub(r'[\.\d\s]+$', '', s).upper()
        continue
    if re.match(r'^\d+$', s) or re.match(r"^\d+\s+PAGE'S", s):
        continue
    mo = OFFS.match(s)
    mn = NUM.match(s)
    if mo and cur is None or (mo and re.search(r'Age', mo.group(3)[:12])):
        if cur:
            entries.append(cur)
        cur = dict(rank=mo.group(1), name=mo.group(2), body=[mo.group(3)], sect=sect, num='', line=i + 1)
    elif mn:
        if cur:
            entries.append(cur)
        cur = dict(rank='', name=mn.group(2) + ', ' + mn.group(3), body=[mn.group(4)], sect=sect, num=mn.group(1), line=i + 1)
    elif cur is not None:
        cur['body'].append(s)
if cur:
    entries.append(cur)

rows = []
for e in entries:
    txt = squash(' '.join(e['body']).replace('- ', ''))
    m = re.search(r'Date\s+of\s+en\w+ment,\s*(.*?)\.\s', txt)
    enl = None
    if m:
        ds = find_dates(m.group(1))
        enl = ds[0] if ds else None
    body = re.sub(r'Age,\s+when\s+enlisted,.*?(?=(Never|Wounded|Captured|Killed|Died|Surrendered|Transferred|Honorably|Discharged|Reported|Not heard|Deserted|Present))', '', txt, flags=re.S)
    body = ' '.join(x for x in re.split(r'(?<=[a-z0-9])\.\s+(?=[A-Z])', body) if not (re.search(r'[Tt]ransferred', x) and re.search(r"to\s+(the\s+)?(Page's|Morris)", x)))
    body = re.sub(r"Transferred\s+(?:and\s+\w+\s+)?from\s+[^.]*?\s+to\s+(?:the\s+)?(?:Page's|Morris|this)[^.]*\.", '', body)
    body = re.sub(r"Promoted\s+[^.]*?\s+and\s+transferred\s+from\s+[^.]*?\.", '', body)
    c = classify_history(body, allow_rank_date=False)
    flags = name_flags(e['name']) + c['flags']
    label, rs, bc, basis = c['label'], c['roll_status'], c['basis_code'], c['basis']
    en_s = ''
    if enl:
        en_s = enl[0].isoformat() if enl[1] == 'day' else enl[0].strftime('%Y-%m')
        if when(enl[0], enl[1]) == 'after':
            if label == 'Present-Documented':
                flags.append('ocr-date-conflict')
            elif label == 'Unknown' or label == 'Absent-Documented' and bc != 'SEP-BEFORE':
                label, rs, bc, basis = 'Absent-Documented', 'not-yet-enlisted', 'ENL-AFTER', 'date of enlistment %s (after 3 July 1863)' % en_s
    if label == 'Unknown' and bc == 'ONROLL-NO-STATUS':
        basis = "on the 1885 roster of Page's Battery (entries by the survivors' committee); no separation before 1 July 1863, no Gettysburg remark; no status for 30 June 1863"
    if re.search(r'Not heard from yet', txt):
        flags.append('not-heard-from')
    rows.append(dict(regiment=REGN, unit_id=UID, company='Battery', section=e['sect'].title(), name_as_printed=squash(e['name']), rank_as_printed=e['rank'] or e['sect'].title(),
                     enlist_or_commission_date=en_s, residence_or_county='', remarks_as_printed=txt[:900], presence_label=label, presence_basis=basis, basis_code=bc,
                     dup_group='', source_id=SID, source_locator='entry %s (text line %d)' % (e['num'] or e['rank'], e['line']), parse_flags=';'.join(sorted(set(flags))), roll_status=rs))
write_csv(OUT + 'csv/C-ART-Page.csv', rows)
print(len(rows), dict(collections.Counter(r['presence_label'] for r in rows)), dict(collections.Counter(r['basis_code'] for r in rows)))
