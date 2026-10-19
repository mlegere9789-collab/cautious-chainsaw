"""Parse the 'Revised Report of Casualties' (Maine at Gettysburg 1898, 20th Maine) and cross-check against participants."""
import re, json, difflib
from collections import Counter, defaultdict

L = open('../cache/maineatgettysbur01main.txt', encoding='utf-8', errors='replace').read().split('\n')
t = ' '.join(l.strip() for l in L[17793:18030])
t = re.sub(r'\s+', ' ', t)
t = t[t.find('Company A.'):]
t = t[:t.find('HISTORICAL SKETCH')]
t = re.sub(r'TWENTIETH REGIMENT CASUALTIES\. \d+', ' ', t)
t = re.sub(r'\d{3} MAINE AT GETTYSBURG\.', ' ', t)
parts = re.split(r'(Company [A-K]\.)', t)
cas = []
for i in range(1, len(parts), 2):
    co = parts[i][8]
    body = parts[i + 1]
    # private form: Surname, Given M., status
    for m in re.finditer(r"([A-Z][A-Za-z'’]+),\s+([A-Z][a-z]+(?:,?\s[A-Z]\.)*(?:\s[A-Z][a-z]+)?\.?),\s+(killed|wounded|w’d|prisoner|mortally|lost)", body):
        cas.append(dict(co=co, name=m.group(2).replace(',', '') + ' ' + m.group(1), status=m.group(3), form='sf'))
    # rank form: Rank Given M. Surname, status
    for m in re.finditer(r"(?:First Sergeant|Sergeant|Corporal|Captain|First Lieutenant|Second Lieutenant|Musician|Sergt\.)\s+((?:[A-Z][a-z]+\.?\s){1,3}[A-Z][a-z’']+),\s+(killed|wounded|w’d|prisoner|mortally|promoted)", body):
        cas.append(dict(co=co, name=m.group(1), status=m.group(2), form='gs'))
    # bare NCO form (no rank prefix) inside SERGEANTS./CORPORALS. lists: 'Given M. Surname, w’d,'
    for m in re.finditer(r"(?<![A-Za-z,] )((?:[A-Z][a-z]+\s){1,2}(?:[A-Z]\.\s)?[A-Z][a-z’']+),\s+(killed|wounded|w’d|prisoner)", body):
        nm = m.group(1)
        if not any(c['name'] == nm for c in cas):
            if not re.search(r'(Company|Sergeant|Corporal|PRIVATES|SERGEANTS|CORPORALS|Captain|Lieutenant)', nm):
                cas.append(dict(co=co, name=nm, status=m.group(2), form='gs2'))
json.dump(cas, open('../cache/meg20_casualties.json', 'w'), indent=0)
print(len(cas), Counter(c['status'] for c in cas), Counter(c['co'] for c in cas))
par = [p for p in json.load(open('../cache/meg20_people.json')) if p.get('kind') in ('private', 'nco', 'detached') and p.get('name')]


def key(n):
    n = re.sub(r"[^A-Za-z ]", ' ', n).split()
    return (n[-1].lower(), n[0].lower()) if len(n) > 1 else (n[0].lower() if n else '', '')


idx = defaultdict(list)
for p in par:
    idx[p['co']].append(key(p['name']))
hit = 0
miss = []
for c in cas:
    k = key(c['name'])
    ok = any(difflib.SequenceMatcher(None, k[0], q[0]).ratio() > 0.85 and difflib.SequenceMatcher(None, k[1], q[1]).ratio() > 0.8 for q in idx[c['co']])
    if ok:
        hit += 1
    else:
        miss.append((c['co'], c['name'], c['status']))
print('casualty names found in participants (same company):', hit, 'of', len(cas))
print(miss[:20])
