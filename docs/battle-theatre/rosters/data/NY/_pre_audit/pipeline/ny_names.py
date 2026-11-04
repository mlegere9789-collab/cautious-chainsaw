"""NY: flag probable OCR variants of surnames across the whole family (R-G1 support). A surname printed once that is one edit away
from a surname printed 3 or more times in the family is flagged 'name-variant-suspect' with the candidate in cross_source. Nothing is corrected:
name_as_printed stays as read. Run after ny_build.py:  python -I -X utf8 ny_names.py"""
import os, sys, csv, glob, re, collections, difflib, json, ctypes
try:
    ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
except Exception:
    pass
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
DATA = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'NY')
COLS = None


def n(s):
    return re.sub(r'[^a-z]', '', s.lower())


files = sorted(glob.glob(os.path.join(DATA, 'rosters', '*.csv')))
allrows = {}
cnt = collections.Counter()
for f in files:
    rows = list(csv.DictReader(open(f, encoding='utf-8')))
    allrows[f] = rows
    for r in rows:
        if r['section'] == 'xref':
            continue
        cnt[n(r['name_clean'].split(',')[0])] += 1
by_first = collections.defaultdict(list)
for s, c in cnt.items():
    if c >= 3 and len(s) >= 4:
        by_first[s[0]].append(s)

cache = {}


def candidate(s):
    if s in cache:
        return cache[s]
    best = None
    for k in by_first.get(s[0], []):
        if abs(len(k) - len(s)) > 1 or k == s:
            continue
        r = difflib.SequenceMatcher(None, s, k).ratio()
        if r >= 0.86 and (best is None or cnt[k] > cnt[best[0]]):
            best = (k, r)
    cache[s] = best[0] if best else None
    return cache[s]


flagged = 0
for f, rows in allrows.items():
    changed = False
    for r in rows:
        if r['section'] == 'xref':
            continue
        s = n(r['name_clean'].split(',')[0])
        if cnt[s] <= 1 and len(s) >= 4:
            c = candidate(s)
            if c and 'name-variant-suspect' not in r['parse_flags']:
                r['parse_flags'] = (r['parse_flags'] + '|' if r['parse_flags'] else '') + 'name-variant-suspect'
                r['cross_source'] = (r['cross_source'] + ' || ' if r['cross_source'] else '') + 'surname printed once; one edit from a surname printed %d times in the NY rosters: %s' % (cnt[c], c.title())
                changed = True
                flagged += 1
    if changed:
        with open(f, 'w', encoding='utf-8', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
print('flagged', flagged, 'of', sum(cnt.values()), 'name rows; distinct surnames', len(cnt))
