"""1st Virginia Infantry (Kemper's brigade): Loehr, War History of the Old First Virginia Infantry Regiment (1884), IA warhistoryold00loehrich.
'List of Members, 1861-1865': name and rank, period of service and fate, company; three columns rebuilt from the djvu.xml word coordinates.
The list gives years, not dates, so only separations or enlistments that fall wholly before or after 1863 decide a label.
Run: python -X utf8 loehr1va_parse.py"""
import re, sys, collections
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/tmp/library/rosters/C-VASCGA')
from vscommon import *
import djvu_pages as D

SID = 'VA-LOEHR-1884-1VA-v1'
UID, REGN = 'C-1VA', '1st Virginia Infantry'
RANK = r'(Corporal|Sergeant|Lieutenant|Captain|Colonel|Lieutenant-Colonel|Major|Assistant-Surgeon|Surgeon|Adjutant|Chaplain|Musician|Drummer|Quartermaster|Commissary|Sergeant-Major|Ensign|Color-Bearer|Bugler|Steward|Hospital Steward)'
FATE = r'(killed|died|discharged|transferred|disabled|resigned|deserted|wounded|captured|retired|dropped|discharged|detailed)'

pages_idx = []
for pi, w, h, words in D.pages(CACHE + 'warhistoryold00loehrich_djvu.xml'):
    t = ' '.join(x[4] for x in words[:12])
    if re.search(r'LIST OF MEMBERS', t):
        pages_idx.append(pi)
print('list pages', pages_idx[0], '-', pages_idx[-1], len(pages_idx))

rows = []
for pi, w, h, words in D.pages(CACHE + 'warhistoryold00loehrich_djvu.xml'):
    if pi not in pages_idx:
        continue
    ws = [x for x in words if x[1] > 330]
    ws.sort(key=lambda t: ((t[1] + t[3]) / 2, t[0]))
    lines = []
    for x in ws:
        yc = (x[1] + x[3]) / 2
        if lines and abs(lines[-1]["y"] - yc) <= 30:
            lines[-1]['w'].append(x)
        else:
            lines.append(dict(y=yc, w=[x]))
    for ln in lines:
        nm = ' '.join(t[4] for t in sorted(ln['w']) if t[0] / w < 0.49)
        sv = ' '.join(t[4] for t in sorted(ln['w']) if 0.49 <= t[0] / w < 0.78)
        co = ' '.join(t[4] for t in sorted(ln['w']) if t[0] / w >= 0.78)
        if len(re.sub(r'[^A-Za-z]', '', nm)) < 2 or re.search(r'LIST OF|MEMBERS|FIRST VIRGINIA', nm):
            continue
        rows.append(dict(nm=nm.strip(), sv=sv.strip(), co=re.sub(r'^Co\.?\s*', '', co.strip()).strip(' .'), page=pi))

out = []
for r in rows:
    nm = r['nm'].strip(' ,')
    rank = ''
    m = re.search(r',\s*' + RANK + r'\s*,?$', nm)
    if m:
        rank, nm = m.group(1), nm[:m.start()]
    nm = squash(nm)
    sv = squash(r['sv']).strip(' ,')
    flags = name_flags(nm)
    label, bc, rs, basis = 'Unknown', 'ONROLL-NO-STATUS', 'on-roll-undetermined', 'on the 1884 list of members of the regiment (1861-1865); the list gives the years of service and fate but no status for 30 June 1863'
    low = sv.lower()
    yrs = [int('18' + y[-2:]) if len(y) == 2 else int(y) for y in re.findall(r'(?<!\d)(18\d\d|\d\d)(?!\d)', sv.replace('-', ' ')) if True]
    full = re.findall(r'18\d\d', sv)
    rng = re.match(r'^(18\d\d)\s*-\s*(\d\d)\b', sv)
    fate = re.search(FATE, low)
    if fate and fate.group(1) in ('transferred', 'detailed', 'detached'):
        fate = None
        flags.append('transfer-destination-unstated')
    if re.match(r'^first year', low):
        label, bc, rs, basis = 'Absent-Documented', 'SEP-BEFORE', 'off-roll-before-battle', 'list prints his service as "%s" (the first year of the war, 1861-62)' % sv
    elif rng:
        y1, y2 = int(rng.group(1)), 1800 + int(rng.group(2))
        if y1 >= 1864:
            label, bc, rs, basis = 'Absent-Documented', 'ENL-AFTER', 'not-yet-enlisted', 'list prints service "%s"' % sv
        elif fate and y2 <= 1862:
            label, bc, rs, basis = 'Absent-Documented', 'SEP-BEFORE', 'off-roll-before-battle', 'list prints "%s": left service in %d' % (sv, y2)
        elif re.search(r'transferred|detailed', low) and y2 <= 1863:
            rs, bc = 'unreadable-or-ambiguous', 'OCR-DATE-LOST'
            basis = 'list prints "%s": transferred, destination not stated (may be to another company of the regiment)' % sv
        elif fate and y2 == 1863:
            rs, bc = 'unreadable-or-ambiguous', 'OCR-DATE-LOST'
            basis = 'list prints "%s": left service in 1863, month not given (before or at Gettysburg cannot be told)' % sv
            flags.append('left-service-1863-month-unknown')
    elif full:
        y = int(full[0])
        if y >= 1864:
            label, bc, rs, basis = 'Absent-Documented', 'ENL-AFTER', 'not-yet-enlisted', 'list prints service beginning/only in %d ("%s")' % (y, sv)
        elif y == 1863:
            rs, bc = 'unreadable-or-ambiguous', 'OCR-DATE-LOST'
            basis = 'list prints "%s": 1863 month not given' % sv
        elif re.search(r'transferred|detailed', low):
            rs, bc = 'unreadable-or-ambiguous', 'OCR-DATE-LOST'
            basis = 'list prints "%s": transferred, destination not stated (may be to another company of the regiment)' % sv
        elif fate and y <= 1862:
            label, bc, rs, basis = 'Absent-Documented', 'SEP-BEFORE', 'off-roll-before-battle', 'list prints "%s": separation in %d' % (sv, y)
        elif not re.search(r'to the (end|last)', low) and y <= 1862 and not fate:
            rs, bc = 'unreadable-or-ambiguous', 'OCR-DATE-LOST'
            basis = 'list prints only the year "%s" (ambiguous: year of joining or of leaving)' % sv
    out.append(dict(regiment=REGN, unit_id=UID, company=r['co'], section='list of members', name_as_printed=nm, rank_as_printed=rank,
                    enlist_or_commission_date='', residence_or_county='', remarks_as_printed=sv, presence_label=label, presence_basis=basis, basis_code=bc,
                    dup_group='', source_id=SID, source_locator='book p.%d (djvu leaf %d)' % (r['page'] - 3, r['page']), parse_flags=';'.join(sorted(set(flags))), roll_status=rs))
write_csv(OUT + 'csv/C-1VA.csv', out)
print(len(out), dict(collections.Counter(r['presence_label'] for r in out)), dict(collections.Counter(r['roll_status'] for r in out)))
print(collections.Counter(r['company'] for r in out).most_common(14))
