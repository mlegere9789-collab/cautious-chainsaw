"""Sick and wounded Confederate soldiers left at Williamsport and Hagerstown after Gettysburg, 13 July to 12 August 1863 (original rolls of Dr J. M. Gaines,
printed from the Richmond Dispatch of 2 April 1899 in Southern Historical Society Papers vol. 27, 1899, pp.241-251), IA
sim_southern-historical-society-papers_january-december-1899_27. One line per man: rank, name, regiment, date of wound, date of death.
Lines for Virginia, Georgia and South Carolina regiments in this family's OOB list are written to csv/<unit>.gaines-hospital.csv.
Run: python -X utf8 gaines_hospital_parse.py"""
import re, sys, collections, json
sys.path.insert(0, 'C:/Users/mlege/gettysburg-map/docs/battle-theatre/rosters/data/C-VASCGA/scripts')
from vscommon import *

SID = 'CS-SHSP27-1899-GAINES-v1'
L = open(CACHE + 'sim_southern-historical-society-papers_january-december-1899_27_djvu.txt', encoding='utf-8', errors='replace').read().splitlines()
OOB = json.load(open(OUT + 'oob_scope.json'))
IDS = {u['id']: u for u in OOB['units']}
START, END = 13445, 14090
txt = []
for ln in L[START - 1:END]:
    s = re.sub(r'\s+', ' ', ln).strip()
    if not s or re.match(r'^\d{1,3}$', s) or re.match(r'^(Fiagerstown|Hagerstown) and Williamsport Hospitals', s) or re.match(r'^\d+ Southern Historical Society Papers', s):
        continue
    txt.append(s)
text = ' '.join(txt).replace('- ', '')
RANK = r'(Private|Sergeant|Lieutenant|Captain|Corporal|Colonel|Major|Surgeon|Musician|Ensign|Adjutant|Orderly|Sergt|Serg\'t)'
parts = re.split(r'(?=\b' + RANK + r'\s+[A-Z][A-Za-z\.]+(?:\s+[A-Z][A-Za-z\.\']+){0,3},\s)', text)
ENT = re.compile(r"^" + RANK + r"\s+([A-Z][^,]{2,40}?),\s+(.+?)(?:;|\.|,)\s*(.*)$")
STATES = {'georgia': 'GA', 'virginia': 'VA', 'south carolina': 'SC', 'north carolina': 'NC', 'mississippi': 'MS', 'alabama': 'AL', 'texas': 'TX', 'louisiana': 'LA', 'florida': 'FL',
          'tennessee': 'TN', 'arkansas': 'AR', 'maryland': 'MD'}


def ordnum(t):
    m = re.match(r'^(\d{1,2})(?:st|d|nd|rd|th)\b', t.strip(), re.I)
    return int(m.group(1)) if m else None


def month_day(s):
    m = re.search(r'wounded\s+(?:on\s+)?(?:July|Aug\w*|June)?\s*(\d{1,2})(?:st|d|nd|rd|th)?', s, re.I)
    return int(m.group(1)) if m else None


all_rows, mine, other_state, unresolved = [], collections.defaultdict(list), collections.Counter(), []
for p in parts:
    p = p.strip()
    m = ENT.match(p)
    if not m:
        continue
    rank, name, reg, rest = m.group(1), m.group(2), m.group(3), m.group(4)
    full = p
    regl = reg.lower()
    st = next((v for k, v in STATES.items() if k in regl), None)
    wnd = re.search(r'wounded\s+(July|June|August|Aug\.?)?\s*([0-9A-Za-z]{1,5})', full, re.I)
    wday, ocrfix = None, False
    if wnd:
        tok = wnd.group(2).lower()
        core = re.sub(r'(st|nd|rd|th|d)$', '', tok)
        mapped = ''.join({'r': '1', 'i': '1', 'l': '1', 't': '1', 'o': '0', 's': '5'}.get(ch, ch) for ch in core)
        if mapped.isdigit() and 1 <= int(mapped) <= 31:
            wday = int(mapped)
            ocrfix = bool(re.search(r'[a-z]', core))
    mon = (wnd.group(1) or 'July').lower() if wnd else ''
    died = re.search(r'died\s+(July|August|Aug\.?)\s*([0-9ri]{1,2})', full, re.I)
    if st is None:
        unresolved.append((full, 'state not read'))
        continue
    other_state[st] += 1
    if st not in ('GA', 'VA', 'SC'):
        continue
    n = ordnum(reg)
    uid = None
    cav = re.search(r'cavalry|legion', regl)
    if re.search(r"cobb", regl):
        uid = 'C-Cobb-GA' if 'C-Cobb-GA' in IDS else None
    elif re.search(r"phillips", regl):
        uid = 'C-Phil-GA' if 'C-Phil-GA' in IDS else None
    elif n is not None:
        base = 'C-%d%s' % (n, st)
        if re.search(r'cavalry', regl):
            base += '-CAV'
        elif re.search(r'battalion', regl):
            base += '-B'
        for cand in (base, base + '-E', base + '-M'):
            if cand in IDS:
                uid = cand
                break
        if st == 'SC' and n == 1:
            uid = None
            unresolved.append((full, '1st South Carolina: the OOB has C-1SC-P (provisional) and C-1SC-R (rifles); regiment named only as "1st South Carolina regiment"'))
            continue
        if st == 'VA' and n == 62 and 'C-62VA-MTD' in IDS and 'cavalry' not in regl:
            uid = 'C-62VA-MTD'
    if uid is None:
        if n is not None and not any(x in regl for x in ('artillery', 'battery')):
            pass            # regiment not in this family's OOB list (not at Gettysburg with the army per OOB file, or a different arm)
        continue
    # label
    label, rs, bc, basis, fl = 'Unknown', 'on-roll-undetermined', 'ONROLL-NO-STATUS', '', []
    if ocrfix:
        fl.append('day-read-from-ocr-letters')
    if wday is not None and mon in ('july', '') and 1 <= wday <= 3:
        label, rs, bc = 'Present-Documented', 'named-present', 'CAS-REMARK'
        basis = 'wounded 1863-07-%02d per the Gaines hospital roll of 13 July to 12 August 1863 (SHSP 27, 1899): "%s"' % (wday, full[:110])
    elif wday is not None:
        label, rs, bc = 'Unknown', 'on-roll-undetermined', 'ONROLL-NO-STATUS'
        basis = 'on the Gaines hospital roll, wounded %s %s 1863 (after the battle, with the army or at Falling Waters); no Gettysburg casualty stated' % (mon or 'July', wday)
        fl.append('wounded-after-3-july')
    else:
        basis = 'on the Gaines hospital roll as sick or without a wound date; the roll does not say where or when he fell ill'
        fl.append('sick-or-undated')
    nm = squash(name)
    fl += name_flags(nm)
    if died:
        fl.append('died-%s-%s' % (died.group(1)[:3].lower(), died.group(2)))
    mine[uid].append(dict(regiment=IDS[uid]['designation'], unit_id=uid, company='?', section='Williamsport and Hagerstown hospital roll 1863', name_as_printed=nm,
                          rank_as_printed=rank, enlist_or_commission_date='', residence_or_county='', remarks_as_printed=full[:200], presence_label=label, presence_basis=basis,
                          basis_code=bc, dup_group='', source_id=SID, source_locator='SHSP 27 pp.241-251', parse_flags=';'.join(sorted(set(fl))), roll_status=rs))
tot = 0
for uid, rows in mine.items():
    write_csv(OUT + 'csv/%s.gaines-hospital.csv' % uid, rows)
    tot += len(rows)
json.dump([dict(line=a, reason=b) for a, b in unresolved], open(OUT + 'gaines_unresolved.json', 'w'), indent=0)
print('all entries by state', dict(other_state), '| rows for this family', tot, 'in', len(mine), 'units', {k: len(v) for k, v in sorted(mine.items())})
