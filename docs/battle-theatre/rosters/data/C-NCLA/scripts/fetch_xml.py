import sys; sys.path.insert(0, 'scripts')
from ncla_common import *
items = [('rosternorthcaro00moorgoog', 'moore_v1'), ('rosterofnorthcar02nort', 'moore_v2'), ('rosterofnorthcar03moor', 'moore_v3'), ('rosterofnorthcar04moor', 'moore_v4'),
         ('recordsofl00loui', 'booth_v1'), ('recordsoflo00loui', 'booth_v2p1'), ('recordsoflouisi00loui', 'booth_v2p2'),
         ('recordsoflouis00loui', 'booth_v3b1p1'), ('recordsofloui00loui', 'booth_v3b1p2'), ('recordsoflou00loui', 'booth_v3b2p1'), ('recordsoflouisia00loui', 'booth_v3b2p2')]
for ident, tag in items:
    p = get(f'https://archive.org/download/{ident}/{ident}_djvu.xml', f'{tag}.{ident}_djvu.xml', timeout=600)
    print(tag, p, flush=True)
