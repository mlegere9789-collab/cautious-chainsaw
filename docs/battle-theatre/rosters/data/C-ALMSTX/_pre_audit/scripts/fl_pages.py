import re, sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\pipeline')
from djvu_pages import pages
src = r'C:\Users\mlege\gettysburg-map\tmp\library\rosters\C-ALMSTX\soldiersofflorid00flor_djvu.xml'
out = {}
for i, w in pages(src):
    out[i] = w
json.dump(out, open(r'C:\Users\mlege\gettysburg-map\tmp\library\rosters\C-ALMSTX\fl_pages.json', 'w'))
print(len(out))
# find pages for headings
for i, w in out.items():
    t = ' '.join(x[4] for x in w)
    if re.search(r'Alachua\s+Guards', t) and 'Roll' in t: print('B', i)
