import sys,re,glob,os
sys.stdout.reconfigure(encoding='utf-8')
name=sys.argv[1]; kw=sys.argv[2] if len(sys.argv)>2 else r'(barn|house|building|burn|demol|destroy|stood|site of|foundation|structure|kitchen|spring ?house)'
mx=int(sys.argv[3]) if len(sys.argv)>3 else 14
pn=re.compile(name,re.I); pk=re.compile(kw,re.I)
n=0
seen=set()
for f in sorted(glob.glob('pdf/*.txt')):
    if 'campbell' in f and False: continue
    L=[re.sub(r'\s+',' ',l).strip() for l in open(f,encoding='utf8',errors='replace').read().split('\n')]
    for i,l in enumerate(L):
        if pn.search(l):
            ctx=' '.join(L[max(0,i-1):i+3])
            if pk.search(ctx):
                key=ctx[:80]
                if key in seen: continue
                seen.add(key)
                print(f"[{os.path.basename(f)[:18]}:{i+1}] {ctx[:420]}")
                n+=1
                if n>=mx: sys.exit()
