import sys
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
import iahelp as h
# args: ident or ident/filename ; filename may be *.xml
for a in sys.argv[1:]:
    if '/' in a: i, fn = a.split('/',1)
    else: i, fn = a, a+'_djvu.txt'
    p=h.fetch('https://archive.org/download/%s/%s'%(i,fn), fn if '/' not in a else fn, 'IA %s; item metadata checked: not access-restricted'%i)
    print(i,fn,p,flush=True)
