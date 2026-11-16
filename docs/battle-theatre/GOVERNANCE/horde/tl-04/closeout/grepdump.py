"""python3 -I tmp/tl-04/grepdump.py R243 "regex" [ctx]  -- show hits in a dumped report with page markers (nearest preceding [[p.N]])"""
import sys,re,glob,os
rid=sys.argv[1]; rx=re.compile(sys.argv[2],re.I); ctx=int(sys.argv[3]) if len(sys.argv)>3 else 300
fs=glob.glob('/home/user/cautious-chainsaw/tmp/tl-04/dump/OR27-*-%s.txt'%rid)
s=open(fs[0],encoding='utf-8').read()
pages=[(m.start(),m.group(1)) for m in re.finditer(r'\[\[p\.([\d\-?]+)\]\]',s)]
last=-10**9
for m in rx.finditer(s):
    if m.start()<last+ctx: continue
    last=m.start()
    pg=[p for o,p in pages if o<=m.start()]
    pg=pg[-1] if pg else '?'
    a=max(0,m.start()-ctx); b=min(len(s),m.end()+ctx)
    print('--- p.%s: ...%s<<%s>>%s...'%(pg,s[a:m.start()],m.group(0),s[m.end():b]))
