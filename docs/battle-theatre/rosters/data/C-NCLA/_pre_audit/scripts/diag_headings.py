import sys,re; sys.path.insert(0,'scripts')
from moore_pipeline import *
u=sys.argv[1]
vol,key=SCOPE[u]
L=load_lines(vol)
s,e=block(vol,key)
for ln in range(s,e):
    l=re.sub(r'\s+',' ',L[ln]).strip()
    if re.match(r'^\W*(C\S{0,3}MPANY|OFFICERS|PRIVATES|NON|FIELD|MUSIC)',l,re.I) or RUNHEAD.match(l) or NOTE.match(l):
        print(ln,l[:90])
