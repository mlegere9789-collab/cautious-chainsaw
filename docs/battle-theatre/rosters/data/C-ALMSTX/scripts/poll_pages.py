import re, sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\pipeline')
from djvu_pages import pages
src = r'C:\Users\mlege\gettysburg-map\tmp\library\rosters\C-ALMSTX\hoodstexasbrigad00poll_djvu.xml'
out = {}
for i, w in pages(src):
    out[i] = w
json.dump(out, open(r'C:\Users\mlege\gettysburg-map\tmp\library\rosters\C-ALMSTX\poll_pages.json', 'w'))
for i, w in out.items():
    t = ' '.join(x[4] for x in w)
    if re.search(r'MUSTER\s+ROLLS\s+OF', t): print(i, t[:80])
