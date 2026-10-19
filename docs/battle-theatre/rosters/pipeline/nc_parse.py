"""Parse the 26th North Carolina roster from Moore's Roster of North Carolina Troops (1882), vol 2, IA rosterofnorthcar02nort."""
import json, re, sys
sys.path.insert(0, '.')
from collections import Counter

lines = open('../cache/moore_rosterofnorthcar02nort.txt', encoding='utf-8', errors='replace').read().split('\n')
start = next(i for i, l in enumerate(lines) if re.match(r'^TWENTY-SIXTH\s+REGIMENT', l.strip()) and i > 20000)
end = next(i for i, l in enumerate(lines) if re.match(r'^TWENTY-SEVENTH\s+REGIMENT', l.strip()) and i > start)
print('26th roster lines', start, end)
block = [re.sub(r'\s+', ' ', l).strip() for l in lines[start:end]]
block = [l for l in block if l]

SKIP = re.compile(r'(Twenty-?\s*Sixth\s+Regiment|North\s+Caro\w*\s+(State\s+)?Troops|^[\W\d]{0,4}\d{3}\W*$|^\W*(d|S|s)?\d{2,3}\W+North)', re.I)
START = re.compile(r"^[►■•\.\*'\^]?[A-Za-z][A-Za-z'\-\.\^é]{0,25}(\s[A-Za-z][A-Za-z'\-\.\^]{0,25}){0,3},\s*\S")
COMP = re.compile(r'^C\S{0,3}MPANY\s+([A-Za-z]{1,2})[\.,]?\s*$')
CMAP = {'A': 'A', 'B': 'B', 'a': 'C', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'II': 'H', 'H': 'H', 'I': 'I', 'K': 'K', 'L': 'L', 'M': 'M'}
company = 'FS'
section = 'officers'
entries = []
cur = None
for l in block:
    m = COMP.match(l)
    if m:
        company = CMAP.get(m.group(1), m.group(1).upper())
        section = 'officers'
        cur = None
        continue
    if re.match(r'^FIELD\s+AND\s+STAFF', l, re.I):
        company, section, cur = 'FS', 'officers', None
        continue
    if re.match(r'^(NON-?\s*COMM|NOX-COMM|NON-COMMISSIONED|NOX-)', l, re.I):
        section, cur = 'nco', None
        continue
    if re.match(r'^PRIVATES\.?$', l, re.I):
        section, cur = 'privates', None
        continue
    if re.match(r'^(OFFICERS|MUSICIANS|ABBREVIATIONS)\.?$', l, re.I):
        if l.upper().startswith('OFFICERS'):
            section = 'officers'
        cur = None
        continue
    if SKIP.search(l) and len(l) < 60:
        continue
    if re.match(r'^(e|d|dg|dt|k|m|p|pr|r|tr|w|c|cm|co|com)\s+[a-z]+(\.|ed|ant)?\s*$', l) and len(l) < 25:
        continue   # abbreviation key
    if START.match(l) and (cur is None or cur['text'].rstrip().endswith('.') or cur['text'].rstrip().endswith('..')):
        cur = dict(co=company, sec=section, text=l)
        entries.append(cur)
    elif cur is not None:
        cur['text'] += ' ' + l
    # else: orphan line
json.dump(entries, open('../cache/nc26_entries_raw.json', 'w'), indent=0)
print(len(entries), Counter(e['co'] for e in entries))
