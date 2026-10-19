import sys; sys.stdout.reconfigure(encoding="utf-8")
import sys,re,glob,os
pat=re.compile(sys.argv[1],re.I); w=int(sys.argv[2]) if len(sys.argv)>2 else 2; mx=int(sys.argv[3]) if len(sys.argv)>3 else 25
files=sys.argv[4:] or sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)),'pdf','*.txt')))
n=0
for f in files:
    L=open(f,encoding='utf8',errors='replace').read().split('\n')
    last=-99
    for i,l in enumerate(L):
        if pat.search(l) and i>last+w:
            print(f"--- {os.path.basename(f)}:{i+1}")
            for j in range(max(0,i-w),min(len(L),i+w+1)): print(re.sub(r'\s+',' ',L[j])[:220])
            last=i; n+=1
            if n>=mx: sys.exit()
