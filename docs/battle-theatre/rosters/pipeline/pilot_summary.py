"""Compute pilot statistics for the three regiments and write pilot CSV/JSON into docs/battle-theatre/rosters/pilot/."""
import json, re, sys, csv, os
sys.path.insert(0, '.')
from dedupe import find_dupes, key
from collections import Counter, defaultdict

OUT = '../../../../docs/battle-theatre/rosters/pilot'
os.makedirs(OUT, exist_ok=True)

stats = {}


def roll_status(label, why):
    w = (why or '').lower()
    if label == 'Duplicate-Xref':
        return 'xref'
    if label == 'Absent-Documented':
        return 'not-yet-enlisted' if ('after the battle' in w or 'drafted' in w or 'enlisted' in w) else 'off-roll-before-battle'
    if label == 'Present-Documented':
        return 'named-present'
    if w.startswith('on-roll') or 'on the 1 dec 1863 return' in w or w.startswith('on roll'):
        return 'on-roll-undetermined'
    return 'unreadable-or-ambiguous'


def flags(name):
    f = []
    n = name or ''
    if re.match(r"^(e\.|cm\.|'|\W)", n) or re.search(r'e\.\s', n):
        f.append('name-garbled')
    if re.search(r"[^A-Za-z\.' \-,]", n):
        f.append('ocr-noise-in-name')
    return ';'.join(f)


# ---------------- 6th Wisconsin ----------------
W = json.load(open('../cache/wis6_classified.json'))
for o in W:
    o['_ord'] = 'sf' if (',' in o['name']) else 'gs'
ex, var = find_dupes(W, 'sf')
transfer = [(a, b) for a, b in ex if re.search(r'From Co|Trans', W[a]['remarks'] + ' ' + W[b]['remarks']) and W[a]['co'] != W[b]['co']]
parent = list(range(len(W)))
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x
for a, b in transfer:
    parent[find(a)] = find(b)
for i, o in enumerate(W):
    o['dup_group'] = f'w{find(i)}'
uniq = set(find(i) for i, o in enumerate(W) if o['label'] != 'Duplicate-Xref')
stats['6th Wisconsin'] = dict(rows=len(W), unique_persons=len(uniq), transfer_pairs=len(transfer), exact_same_name_pairs=len(ex), variant_pairs=len(var),
                              labels=dict(Counter(o['label'] for o in W)))
with open(f'{OUT}/6th-wisconsin.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['regiment', 'company', 'section', 'name_as_printed', 'name_clean', 'residence', 'enlist_or_rank_date', 'remarks_as_printed', 'presence_label', 'presence_basis', 'dup_group', 'source_id', 'source_page_idx_ia', 'parse_flags', 'roll_status'])
    for o in W:
        w.writerow(['6th Wisconsin Infantry', o['co'], o['sec'], o['name_raw'], o['name'], o['res'], o['enl'] or '', o['remarks'], o['label'], o['why'], o['dup_group'], 'WI-ROSTER-1886-v1', o['page'], flags(o['name_raw']), roll_status(o['label'], o['why'])])

# ---------------- 20th Maine ----------------
M = json.load(open('../cache/me20_final.json'))
for o in M:
    o['_ord'] = 'sf' if o['sec'] in ('privates', 'joined') else 'gs'
ex, var = find_dupes(M, 'gs')
transfer = [(a, b) for a, b in ex if re.search(r'compan|Trans|Tr\.|From', M[a]['remarks'] + ' ' + M[b]['remarks'], re.I) and M[a]['co'] != M[b]['co']]
parent = list(range(len(M)))
for a, b in transfer:
    parent[find(a)] = find(b)
for i, o in enumerate(M):
    o['dup_group'] = f'm{find(i)}'
uniq = set(find(i) for i in range(len(M)))
stats['20th Maine'] = dict(rows=len(M), unique_persons=len(uniq), transfer_pairs=len(transfer), exact_same_name_pairs=len(ex), variant_pairs=len(var),
                           labels=dict(Counter(o['label'] for o in M)))
with open(f'{OUT}/20th-maine.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['regiment', 'company', 'section', 'name_as_printed', 'age', 'residence', 'mustered', 'remarks_as_printed', 'in_1898_participants_list', 'presence_label', 'presence_basis', 'dup_group', 'source_ids', 'source_page_idx_ia', 'parse_flags', 'roll_status'])
    for o in M:
        w.writerow(['20th Maine Infantry', o['co'], o['sec'], o['name'], o['age'], o['res'], o['mustered'], o['remarks'], 'yes' if o.get('participant') else 'no', o['label'], o['why'], o['dup_group'],
                    'ME-AGR-1863-AppD' + ('+ME-AT-GETTYSBURG-1898' if o.get('participant') else ''), o['page'], flags(o['name']), roll_status(o['label'], o['why'])])
    # participants not matched to a return row
    for p in json.load(open('../cache/meg20_unmatched.json')):
        w.writerow(['20th Maine Infantry', p['co'], 'participant-only', p['name'], '', p['res'], '', '', 'yes', 'Present-Documented',
                    'named in Maine at Gettysburg 1898 participants list; no matching row found on the 1 Dec 1863 return (spelling/OCR variant or man left before the return)', '', 'ME-AT-GETTYSBURG-1898', '', flags(p['name']), 'named-present'])

# ---------------- 26th North Carolina ----------------
N = json.load(open('../cache/nc26_classified.json'))
for o in N:
    o['_ord'] = 'sf' if o['style'] == 'sf' else 'gs'
ex, var = find_dupes(N, 'sf')
same_person_officer = [(a, b) for a, b in ex if N[a]['co'] == N[b]['co']]
parent = list(range(len(N)))
for a, b in ex:
    parent[find(a)] = find(b)
for i, o in enumerate(N):
    o['dup_group'] = f'n{find(i)}'
uniq = set(find(i) for i in range(len(N)))
stats['26th North Carolina'] = dict(rows=len(N), unique_persons_if_all_same_name_pairs_merged=len(uniq), exact_same_name_pairs=len(ex), same_company_same_name_pairs=len(same_person_officer), variant_pairs=len(var),
                                    labels=dict(Counter(o['label'] for o in N)))
with open(f'{OUT}/26th-north-carolina.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['regiment', 'company', 'section', 'name_as_printed', 'rank', 'enlist_or_commission_date', 'moore_1882_entry', 'presence_label', 'presence_basis', 'dup_group', 'source_id', 'parse_flags', 'roll_status'])
    for o in N:
        w.writerow(['26th North Carolina Infantry', o['co'], o['sec'], o['name'], o['rank'], o['enl'] or '', o['body'], o['label'], o['why'], o['dup_group'], 'NC-MOORE-1882-v2', flags(o['name']), roll_status(o['label'], o['why'])])

stats['6th Wisconsin']['name_flagged_rows'] = sum(1 for o in W if flags(o['name_raw']))
stats['20th Maine']['name_flagged_rows'] = sum(1 for o in M if flags(o['name']))
stats['26th North Carolina']['name_flagged_rows'] = sum(1 for o in N if flags(o['name']))
json.dump(stats, open(f'{OUT}/pilot-stats.json', 'w'), indent=1)
print(json.dumps(stats, indent=1))
# per-company reconciliation for the 26th NC
doc_present = dict(A=97, B=92, C=80, D=79, E=104, F=91, G=91, H=78, I=74, K=99)
print('26th NC per company: Moore on-roll-not-absent (Present-Documented + Unknown) vs Clark June 30 present-for-duty')
tot = 0
for c in 'ABCDEFGHIK':
    rows = [o for o in N if o['co'] == c]
    ng = [o for o in rows if o['label'] != 'Absent-Documented']
    pd = [o for o in rows if o['label'] == 'Present-Documented']
    tot += len(ng)
    print(c, 'rows', len(rows), 'not-absent', len(ng), 'present-documented', len(pd), 'clark_present_for_duty', doc_present[c])
print('total not-absent', tot)
