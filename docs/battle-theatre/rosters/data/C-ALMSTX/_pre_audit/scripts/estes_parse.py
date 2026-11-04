"""Field officers (colonels, lieutenant-colonels, majors) of every unit in the C-ALMSTX scope from Estes, List of Field Officers, Regiments and Battalions in the
Confederate States Army 1861-1865 (Macon, 1912; built on Marcus J. Wright's War Department list).  No dates; presence is not stated."""
import sys, re, os, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *
L = open(CACHE + r'\norm\listoffieldoffic00este_djvu.txt', encoding='utf-8', errors='replace').read().split('\n')
# part 1 = alphabetical list of officers
start = next(i for i, s in enumerate(L) if s.startswith('LIST OF FIELD OFFICERS IN THE CONFEDERATE'))
end = next((i for i, s in enumerate(L) if i > start + 100 and re.match(r'^(REGIMENTS AND BATTALIONS|LIST OF REGIMENTS)', s.strip())), len(L))
print('part1 lines', start, end)
TARGET = {
    'Alabama': {3: 'C-3AL', 4: 'C-4AL', 5: 'C-5AL-R', 6: 'C-6AL', 8: 'C-8AL', 9: 'C-9AL', 10: 'C-10AL', 11: 'C-11AL', 12: 'C-12AL', 13: 'C-13AL', 14: 'C-14AL', 15: 'C-15AL', 26: 'C-26AL', 44: 'C-44AL', 47: 'C-47AL', 48: 'C-48AL'},
    'Mississippi': {2: 'C-2MS', 11: 'C-11MS', 12: 'C-12MS', 13: 'C-13MS', 16: 'C-16MS', 17: 'C-17MS', 18: 'C-18MS', 19: 'C-19MS', 21: 'C-21MS', 42: 'C-42MS', 48: 'C-48MS'},
    'Texas': {1: 'C-1TX', 4: 'C-4TX', 5: 'C-5TX'}, 'Arkansas': {3: 'C-3AR'}, 'Florida': {2: 'C-2FL', 5: 'C-5FL', 8: 'C-8FL'},
    'Tennessee': {1: 'C-1TN-P', 7: 'C-7TN', 14: 'C-14TN'}, 'Maryland': {1: 'C-1MD-CSA', 2: 'C-1MD-CSA'},
}
REG = re.compile(r"((?:(?:Major|Lieutenant-Colonel|Colonel)\s*,?\s*)+)\s*(?:of\s+)?(\d{1,2})(?:st|d|nd|rd|th)\s+(\([^)]{2,25}\)\s*)?(Alabama|Mississippi|Texas|Arkansas|Florida|Tennessee|Maryland)\s+(Infantry|Volunteers|Regiment|Battalion)?", re.I)
entries = []; cur = ''
for s in L[start + 1:end]:
    s = s.strip()
    if not s:
        continue
    if re.match(r"^[A-Z][A-Za-z'\-]+( [A-Za-z'\-]+)?,\s+(\(\*\)\s+)?[A-Z]", s) and (cur.rstrip().endswith('.') or not cur):
        if cur: entries.append(cur)
        cur = s
    else:
        if cur.endswith('-') and not cur.endswith(' -'): cur = cur[:-1] + s
        else: cur = (cur + ' ' + s).strip()
if cur: entries.append(cur)
print('entries', len(entries))
byunit = {}
for e in entries:
    nm = re.match(r"^([A-Z][A-Za-z'\-]+(?: [A-Za-z'\-]+)?,\s+(?:\(\*\)\s+)?[^,]+),", e)
    if not nm: continue
    name = nm.group(1).replace('(*) ', '').strip()
    for m in REG.finditer(e):
        ranks = [r.strip(' ,') for r in re.findall(r"Major|Lieutenant-Colonel|Colonel", m.group(1))]
        st = m.group(4).title(); num = int(m.group(2))
        kind = (m.group(5) or '').title()
        if num not in TARGET.get(st, {}): continue
        if kind == 'Battalion': continue
        # skip when the text after the designation says Cavalry / Artillery / Sharpshooters
        tail = e[m.end():m.end() + 14].lower()
        if re.match(r"\s*(cavalry|artillery|battalion|sharp)", tail): continue
        uid = TARGET[st][num]
        fl = name_flags(name)
        if st == 'Tennessee' and num == 1: fl.append('regiment-numbering-ambiguous(1st Tennessee Provisional/Maney vs OOB)')
        if st == 'Maryland': fl.append('unit-identity-contested')
        byunit.setdefault(uid, []).append((name, ranks[-1] if ranks else '', e[:260], fl, st, num))
os.makedirs(DATA + r'\field-officers', exist_ok=True)
allstats = {}
for uid, items in sorted(byunit.items()):
    wr = Writer('field-officers-' + uid)
    seen = set()
    for name, rank, text, fl, st, num in items:
        if (name, rank) in seen: continue
        seen.add((name, rank))
        wr.add(unit_id=uid, regiment='%d%s %s' % (num, 'th' if num > 3 else {1: 'st', 2: 'nd', 3: 'rd'}[num], st), company='FS', section='field officers (any date 1861-65)', name_as_printed=name, rank=rank,
               source_entry=text, presence_label='Unknown', presence_basis='ONROLL-NO-STATUS: listed as a field officer of this regiment at some date in 1861-65; the list gives no dates and no battle status',
               source_id='US-ESTES-1912', locator='Estes 1912, alphabetical list of field officers', parse_flags=';'.join(sorted(set(fl))), roll_status='on-roll-undetermined')
    wr.save('field-officers')
    allstats[uid] = wr.stats()['rows']
print(allstats, sum(allstats.values()))
progress('field officers (Estes 1912) parsed for %d units, %d rows' % (len(allstats), sum(allstats.values())))
