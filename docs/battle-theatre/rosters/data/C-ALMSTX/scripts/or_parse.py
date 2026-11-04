"""Officers named in the Confederate reports of OR Series I vol 27 (Gettysburg campaign), for the regiments of the C-ALMSTX scope.
Source file: IA cu31924077728255 (Cornell copy of OR vol 27; the Confederate reports volume), already in tmp/library/or27/ from earlier work; sha256 recorded in acquired.json."""
import sys, re, os, json, hashlib
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
from rlib import *
SRC = r'C:\Users\mlege\gettysburg-map\tmp\library\or27\cu31924077728255_djvu.txt'
txt = re.sub(r'[ \t]+', ' ', open(SRC, encoding='utf-8', errors='replace').read())
lines = txt.split('\n')
ORD = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10, 'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14,
       'fifteenth': 15, 'sixteenth': 16, 'seventeenth': 17, 'eighteenth': 18, 'nineteenth': 19, 'twenty-first': 21, 'twenty-sixth': 26, 'forty-second': 42, 'forty-fourth': 44, 'forty-seventh': 47, 'forty-eighth': 48}
TARGET = {('Alabama', n): 'C-%dAL' % n for n in (3, 4, 6, 8, 9, 10, 11, 12, 13, 14, 15, 26, 44, 47, 48)}
TARGET[('Alabama', 5)] = 'C-5AL-R'
TARGET.update({('Mississippi', n): 'C-%dMS' % n for n in (2, 11, 12, 13, 16, 17, 18, 19, 21, 42, 48)})
TARGET.update({('Texas', 1): 'C-1TX', ('Texas', 4): 'C-4TX', ('Texas', 5): 'C-5TX', ('Arkansas', 3): 'C-3AR', ('Florida', 2): 'C-2FL', ('Florida', 5): 'C-5FL', ('Florida', 8): 'C-8FL',
               ('Tennessee', 1): 'C-1TN-P', ('Tennessee', 7): 'C-7TN', ('Tennessee', 14): 'C-14TN', ('Maryland', 1): 'C-1MD-CSA', ('Maryland', 2): 'C-1MD-CSA'})
ordre = '|'.join(sorted(ORD, key=len, reverse=True))
RANK = r"(Col\.|Colonel|Lieut\.? ?-?Col\.?|Lieutenant-Colonel|Lieutenant Colonel|Maj\.|Major|Capt\.|Captain|Lieut\.|Lieutenant|Adjt\.|Adjutant|Sergt\.|Sergeant|Surg\.|Surgeon)"
NAME = r"((?:[A-Z]\. ?){0,3}[A-Z][a-z]+(?:[- ][A-Z][a-z]+)?)"
PAT = re.compile(RANK + r"\s+" + NAME + r",?\s+(?:of the |commanding the |commanding |of |, )?(?:the )?(" + ordre + r")\s+(Alabama|Mississippi|Texas|Arkansas|Florida|Tennessee|Maryland)", re.I)
wr = {}
flat = ' '.join(lines)
# map char offset back to a line number
offs = []; o = 0
for i, s in enumerate(lines):
    offs.append(o); o += len(s) + 1
import bisect
seen = set()
for m in PAT.finditer('\n'.join(lines)):
    pass
full = '\n'.join(lines)
for m in PAT.finditer(full):
    rank = m.group(1); name = m.group(2).strip(); n = ORD.get(m.group(3).lower()); st = m.group(4).title()
    uid = TARGET.get((st, n))
    if not uid: continue
    ln = bisect.bisect_right(offs, m.start())
    ctx = re.sub(r'\s+', ' ', full[max(0, m.start() - 160):m.end() + 200])
    key = (uid, re.sub(r'[^a-z]', '', name.lower()), rank.lower()[:3])
    if key in seen: continue
    seen.add(key)
    w = wr.setdefault(uid, Writer('or27-officers-' + uid))
    w.add(unit_id=uid, regiment='%s %s' % (m.group(3).title(), st), company='FS/officers', section='named in a Confederate report, OR 27', name_as_printed=name, rank=rank,
          source_entry=ctx[:360], presence_label='Unknown', presence_basis='ONROLL-NO-STATUS: LEAD ONLY. Named with the regiment in the OR 27 Confederate reports volume (index entry or report text); the text was not read to confirm that he was at Gettysburg on 1-3 July, so no presence is asserted (context given)',
          source_id='US-OR27-REPORTS', locator='OR 27 reports vol, djvu line %d' % ln, parse_flags='lead-only-needs-context-check', roll_status='on-roll-undetermined')
os.makedirs(DATA + r'\or27-officers', exist_ok=True)
tot = 0
for uid, w in wr.items():
    w.save('or27-officers'); tot += len(w.rows)
print({u: len(w.rows) for u, w in wr.items()}, tot)
progress('OR 27 report officers extracted: %d rows over %d units' % (tot, len(wr)))
