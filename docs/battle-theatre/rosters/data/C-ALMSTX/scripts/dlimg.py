import sys
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
import iahelp as h
for ident, n in [('soldiersofflorid00flor', 196), ('hoodstexasbrigad00poll', 356), ('01897724.3053.emory.edu', None)][:2]:
    p = h.fetch('https://archive.org/download/%s/page/n%d_w1500.jpg' % (ident, n), '%s_page_n%d_w1500.jpg' % (ident, n), 'QA page image')
    print(p)
