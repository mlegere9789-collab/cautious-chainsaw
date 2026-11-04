"""AUDIT 2026-10-30: fetch a few Soldiers of Florida / Polley page images (IA item pages, not lending-restricted) for the image check; logged in acquired.json by iahelp."""
import sys
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
import iahelp as h
for ident, n in [('soldiersofflorid00flor', 102), ('soldiersofflorid00flor', 145), ('hoodstexasbrigad00poll', 365)]:
    p = h.fetch('https://archive.org/download/%s/page/n%d_w1500.jpg' % (ident, n), '%s_page_n%d_w1500.jpg' % (ident, n), 'QA page image (audit)')
    print(ident, n, p)
