"""Parse A. H. Boies, Roster of the survivors of the battle of Gettysburg living in the state of Michigan (May 1913).
One printed line per man: 'Surname, Initials, Co. X, 3rd Mich. Infantry, Town, Mich.'
Output: tmp/library/rosters/MW/work/boies_all.json (every parsed line) and boies_mw.json (lines that map to the 26 MW units).
The page index (IA djvu page) is found by locating the printed line in the xml page text."""
import json, re, sys, os
from collections import Counter
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
W = os.path.join(ROOT, 'tmp', 'library', 'rosters', 'MW')
P = json.load(open(os.path.join(W, 'boies.pages.json')))

UNITS = {
    ('mi', 'inf'): {1, 3, 4, 5, 7, 16, 24}, ('mi', 'cav'): {1, 5, 6, 7},
    ('wi', 'inf'): {2, 3, 5, 6, 7, 26}, ('in', 'inf'): {14, 19, 20, 27}, ('in', 'cav'): {3},
    ('il', 'inf'): {82}, ('il', 'cav'): {8, 12}, ('mn', 'inf'): {1},
}
STATES = {'mich': 'mi', 'michigan': 'mi', 'wis': 'wi', 'wisconsin': 'wi', 'ind': 'in', 'indiana': 'in', 'ill': 'il', 'illinois': 'il', 'minn': 'mn', 'minnesota': 'mn'}
LINE = re.compile(r"^\W{0,3}([A-Z][A-Za-z'\-\.]+),\s+([A-Za-z][A-Za-z\.\s\-]{0,24}?),\s+(.*)$")

pagetext = {}
for k in P:
    ws = sorted(P[k], key=lambda w: ((w[1] + w[3]) // 40, w[0]))
    pagetext[int(k)] = re.sub(r'\s+', ' ', ' '.join(w[4] for w in ws))
txt = open(os.path.join(W, 'rosterofsurvivor00boie_djvu.txt'), encoding='utf8').read().split('\n')

out = []
for raw in txt:
    t = re.sub(r'\s+', ' ', raw).strip()
    m = LINE.match(t)
    if not m:
        continue
    rest = m.group(3)
    if not re.search(r'Mich|Inf|Cav|Art|Reg|S\.\s*S\.|Wis|Ind|Ill|Minn', rest):
        continue
    pn = None
    key = (m.group(1) + ', ' + m.group(2))[:14]
    for k in sorted(pagetext):
        if key in pagetext[k]:
            pn = k
            break
    co = re.search(r'\bCo\.?\s*([A-M])\b', rest)
    low = rest.lower()
    num = None
    mn = re.search(r'(\d{1,3})\s*(?:st|nd|rd|th|d)?\.?\s*(?:u\.?\s*s\.?\s*)?(mich|wis|ind|ill|minn|n\.?\s*y|penn|ohio|vt|vermont|illinois|indiana|wisconsin|minnesota|michigan)', low)
    state = None; arm = None
    if mn:
        num = int(mn.group(1)); state = STATES.get(mn.group(2))
    if re.search(r'cav', low):
        arm = 'cav'
    elif re.search(r'inf|irf|lnf', low) or (state and not re.search(r'art', low)):
        arm = 'inf'
    elif re.search(r'art', low):
        arm = 'art'
    unit = None
    if state and arm and num and num in UNITS.get((state, arm), set()) and not re.search(r's\.\s*s', low[:mn.end() + 20]):
        unit = '%s-%d-%s' % (state, num, arm)
    out.append(dict(page=pn, surname=m.group(1), given=m.group(2).strip(), company=co.group(1) if co else '', unit=unit, line=t))

json.dump(out, open(os.path.join(W, 'work', 'boies_all.json'), 'w'), indent=0)
mw = [o for o in out if o['unit']]
json.dump(mw, open(os.path.join(W, 'work', 'boies_mw.json'), 'w'), indent=0)
print(len(out), 'parsed lines;', len(mw), 'in the 26 MW units; without page', sum(1 for o in out if o['page'] is None))
print(sorted(Counter(o['unit'] for o in mw).items()))
